import type {
  DetectedObject,
  DetectionFrame,
  NormalizedBounds,
} from '../../domain/DetectedObject';

const MAX_MATCH_DISTANCE = 0.32;
const MIN_MATCH_IOU = 0.15;
const MAX_PREDICTION_HORIZON_MS = 180;
/**
 * The detector delivers roughly ten noisy results per second, so a label can
 * drop out for a few of them while the object stays in frame. Retention has to
 * outlast that gap, and a track has to be seen more than once before it earns a
 * layer, otherwise single-frame noise flashes a card over the scene.
 */
const MISSING_TRACK_RETENTION_MS = 800;
/**
 * How long a card that is already on screen survives losing its object.
 *
 * Reaching for the practise button puts a hand between the camera and the
 * thing being named, so the detector loses it at exactly the moment the
 * learner is trying to press it. Eight hundred milliseconds was shorter than
 * that reach. An unconfirmed track keeps the shorter retention above, so noise
 * still clears fast — this only protects something the learner can see.
 */
const CONFIRMED_TRACK_RETENTION_MS = 2200;
/**
 * What a detection has to do before it earns a card.
 *
 * A small model is confidently wrong now and then — a microwave read as a
 * toilet, an earphone read as a bird — and a learner remembers the wrong word
 * far longer than the right one. So a track has to hold the same label on the
 * same place before anything is said about it.
 *
 * How long it has to hold depends on how sure the model was. One flat bar on
 * confidence could not express that, and stacking a second bar above the
 * detector's own floor was worse than strict: an object the model read
 * steadily at seven tenths could sit in perfect light forever and never earn a
 * word, because no amount of holding still raised the mean. The camera had to
 * be waved about until a reading happened to spike.
 *
 * Persistence is separate evidence from score. A wrong name is unstable — it
 * flickers between labels and places, so it never gathers readings. A quiet,
 * steady, middling reading is usually a real object the model is simply not
 * loud about. So the two trade against each other: the surer the model, the
 * sooner it is believed; the less sure, the longer it has to keep saying the
 * same thing about the same place.
 *
 * Each rung asks for readings and for time, because readings alone are not a
 * fixed amount of waiting. The detector's rate moves with how warm the phone
 * is — the same eight-core device was measured at 8.6 readings per second cold
 * and 5.7 warm — so a rung counted only in readings made a card appear in half
 * a second on a cool phone and in three quarters of a second on the same phone
 * ten minutes later. The floor holds the wait steady where the readings are
 * cheap, and the count still governs where they are dear.
 *
 * The floors are the waits the old counts produced at ten readings a second,
 * and the counts are what that same wait buys at five. So a fast detector
 * waits exactly as long as it always did, and a slow one stops being punished
 * for being slow: the top rung falls from 600 ms to 400 ms on a phone managing
 * five readings a second, and the bottom from 2.2 s to 1.4 s.
 *
 * Tracks are matched within a label, so a detector that cannot decide between
 * two names never accumulates the readings for either, and nothing is shown
 * until it settles.
 */
const CONFIRMATION_LADDER = [
  { meanConfidence: 0.75, minHits: 3, minVisibleMs: 300 },
  { meanConfidence: 0.58, minHits: 5, minVisibleMs: 600 },
  { meanConfidence: 0.45, minHits: 8, minVisibleMs: 1000 },
] as const;
const VELOCITY_SMOOTHING = 0.55;
/**
 * The shortest gap that counts as time passing.
 *
 * The detector delivers around ten results a second, but several workers can
 * land theirs inside the same millisecond. Dividing a displacement by that gap
 * gave velocities two orders of magnitude too large, and the projection below
 * then threw the box clean off the screen and back on the next reading. The
 * floor is a real frame interval rather than one millisecond, so a bunched
 * pair of readings reads as one step rather than as a sprint.
 */
const MIN_VELOCITY_INTERVAL_MS = 40;
/**
 * The fastest an object is allowed to be believed to move: about a quarter of
 * the frame every hundred milliseconds. Past that it is a box that jumped to a
 * different object, or a weak reading wobbling in place — never something the
 * card should chase.
 */
const MAX_VELOCITY_PER_MS = 0.0008;

/** Enough readings, held for long enough, for how sure the model was. */
function isConfirmed(track: ObjectTrack, nowMs: number) {
  const meanConfidence = track.confidenceSum / track.hits;
  const visibleForMs = nowMs - track.firstSeenAtMs;

  return CONFIRMATION_LADDER.some(
    step =>
      meanConfidence >= step.meanConfidence &&
      track.hits >= step.minHits &&
      visibleForMs >= step.minVisibleMs,
  );
}
/**
 * The detector re-measures every box from scratch, so a still object still
 * moves a pixel or two between results. Blending each new measurement into the
 * previous one absorbs that noise, and movement under the deadband is treated
 * as the same position rather than a tiny jump.
 */
const BOUNDS_SMOOTHING = 0.35;
const STILL_DEADBAND = 0.006;

interface MotionVector {
  height: number;
  width: number;
  x: number;
  y: number;
}

interface ObjectTrack {
  confidence: number;
  hits: number;
  /** When this track was first seen, which is what the time floor measures. */
  firstSeenAtMs: number;
  /** Mean confidence across the readings that built this track. */
  confidenceSum: number;
  id: string;
  label: string;
  /** The last display name the classifier gave this track, if it gave one. */
  refinedLabel: string | undefined;
  lastObservedBounds: NormalizedBounds;
  lastSeenAtMs: number;
  velocity: MotionVector;
}

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(Math.max(value, minimum), maximum);
}

function intersectionOverUnion(a: NormalizedBounds, b: NormalizedBounds) {
  const overlapWidth = Math.max(
    0,
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
  );
  const overlapHeight = Math.max(
    0,
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
  );
  const overlap = overlapWidth * overlapHeight;
  const union = a.width * a.height + b.width * b.height - overlap;

  return union > 0 ? overlap / union : 0;
}

function centerDistance(a: NormalizedBounds, b: NormalizedBounds) {
  const aCenterX = a.x + a.width / 2;
  const aCenterY = a.y + a.height / 2;
  const bCenterX = b.x + b.width / 2;
  const bCenterY = b.y + b.height / 2;

  return Math.hypot(aCenterX - bCenterX, aCenterY - bCenterY);
}

function calculateVelocity(
  previous: ObjectTrack,
  currentBounds: NormalizedBounds,
  elapsedMs: number,
): MotionVector {
  const currentVelocity = {
    height:
      (currentBounds.height - previous.lastObservedBounds.height) / elapsedMs,
    width:
      (currentBounds.width - previous.lastObservedBounds.width) / elapsedMs,
    x: (currentBounds.x - previous.lastObservedBounds.x) / elapsedMs,
    y: (currentBounds.y - previous.lastObservedBounds.y) / elapsedMs,
  };

  const blend = (before: number, now: number) =>
    clamp(
      before * VELOCITY_SMOOTHING + now * (1 - VELOCITY_SMOOTHING),
      -MAX_VELOCITY_PER_MS,
      MAX_VELOCITY_PER_MS,
    );

  return {
    height: blend(previous.velocity.height, currentVelocity.height),
    width: blend(previous.velocity.width, currentVelocity.width),
    x: blend(previous.velocity.x, currentVelocity.x),
    y: blend(previous.velocity.y, currentVelocity.y),
  };
}

function projectBounds(
  bounds: NormalizedBounds,
  velocity: MotionVector,
  horizonMs: number,
): NormalizedBounds {
  const width = clamp(bounds.width + velocity.width * horizonMs, 0, 1);
  const height = clamp(bounds.height + velocity.height * horizonMs, 0, 1);
  // Position is deliberately not clamped to the viewport: a box leaving the
  // frame has to keep travelling with its object.

  return {
    x: bounds.x + velocity.x * horizonMs,
    y: bounds.y + velocity.y * horizonMs,
    width,
    height,
  };
}

const ZERO_VELOCITY: MotionVector = { height: 0, width: 0, x: 0, y: 0 };

function smoothBounds(
  previous: NormalizedBounds,
  observed: NormalizedBounds,
): NormalizedBounds {
  const settled =
    Math.abs(observed.x - previous.x) < STILL_DEADBAND &&
    Math.abs(observed.y - previous.y) < STILL_DEADBAND &&
    Math.abs(observed.width - previous.width) < STILL_DEADBAND &&
    Math.abs(observed.height - previous.height) < STILL_DEADBAND;

  if (settled) return previous;

  const blend = (from: number, to: number) =>
    from + (to - from) * BOUNDS_SMOOTHING;

  return {
    height: blend(previous.height, observed.height),
    width: blend(previous.width, observed.width),
    x: blend(previous.x, observed.x),
    y: blend(previous.y, observed.y),
  };
}

export class DetectionMotionTracker {
  private nextTrackId = 1;
  private tracks = new Map<string, ObjectTrack>();

  reset() {
    this.nextTrackId = 1;
    this.tracks.clear();
  }

  update(frame: DetectionFrame, nowMs: number): DetectionFrame {
    const availableTracks = [...this.tracks.values()];
    const matchedTrackIds = new Set<string>();
    const nextTracks = new Map<string, ObjectTrack>();
    const trackedObjects: DetectedObject[] = [];
    const predictionHorizonMs = Math.min(
      Math.max(frame.inferenceTimeMs * 0.5, 0),
      MAX_PREDICTION_HORIZON_MS,
    );

    frame.objects.forEach(object => {
      // A fast-moving object can leave no overlap between two results, so
      // proximity still matches — but only within the object's own size, so a
      // second object of the same label cannot steal the track.
      const proximityLimit = Math.min(
        MAX_MATCH_DISTANCE,
        Math.max(object.bounds.width, object.bounds.height),
      );
      const matchingTrack = availableTracks
        .filter(
          track =>
            track.label === object.label && !matchedTrackIds.has(track.id),
        )
        .map(track => ({
          distance: centerDistance(track.lastObservedBounds, object.bounds),
          overlap: intersectionOverUnion(
            track.lastObservedBounds,
            object.bounds,
          ),
          track,
        }))
        .filter(
          candidate =>
            candidate.overlap >= MIN_MATCH_IOU ||
            candidate.distance <= proximityLimit,
        )
        .sort(
          (a, b) => b.overlap - a.overlap || a.distance - b.distance,
        )[0]?.track;

      const id = matchingTrack?.id ?? `${object.label}-${this.nextTrackId++}`;
      const elapsedMs = Math.max(
        nowMs - (matchingTrack?.lastSeenAtMs ?? nowMs),
        MIN_VELOCITY_INTERVAL_MS,
      );
      const bounds = matchingTrack
        ? smoothBounds(matchingTrack.lastObservedBounds, object.bounds)
        : object.bounds;
      const velocity = matchingTrack
        ? calculateVelocity(matchingTrack, bounds, elapsedMs)
        : ZERO_VELOCITY;
      const track: ObjectTrack = {
        confidence: object.confidence,
        confidenceSum: (matchingTrack?.confidenceSum ?? 0) + object.confidence,
        firstSeenAtMs: matchingTrack?.firstSeenAtMs ?? nowMs,
        hits: (matchingTrack?.hits ?? 0) + 1,
        id,
        label: object.label,
        // A frame the classifier skipped keeps the name the track already
        // had, so a box does not lose its word between namings.
        refinedLabel: object.refinedLabel ?? matchingTrack?.refinedLabel,
        lastObservedBounds: bounds,
        lastSeenAtMs: nowMs,
        velocity,
      };

      matchedTrackIds.add(id);
      nextTracks.set(id, track);
      if (!isConfirmed(track, nowMs)) return;

      trackedObjects.push({
        ...object,
        id,
        bounds: projectBounds(bounds, velocity, predictionHorizonMs),
        isMissing: false,
        // Only one box per frame is named now, so the emitted object reads the
        // track's name rather than this frame's, which is usually absent.
        refinedLabel: track.refinedLabel,
      });
    });

    availableTracks.forEach(track => {
      if (matchedTrackIds.has(track.id)) return;

      const missingForMs = nowMs - track.lastSeenAtMs;
      const retentionMs = isConfirmed(track, nowMs)
        ? CONFIRMED_TRACK_RETENTION_MS
        : MISSING_TRACK_RETENTION_MS;
      if (missingForMs > retentionMs) return;

      nextTracks.set(track.id, track);
      if (!isConfirmed(track, nowMs)) return;

      trackedObjects.push({
        bounds: projectBounds(
          track.lastObservedBounds,
          track.velocity,
          Math.min(missingForMs, MAX_PREDICTION_HORIZON_MS),
        ),
        confidence: track.confidence,
        id: track.id,
        isMissing: true,
        label: track.label,
        refinedLabel: track.refinedLabel,
      });
    });

    this.tracks = nextTracks;
    return { ...frame, objects: trackedObjects };
  }
}
