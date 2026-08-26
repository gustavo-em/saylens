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
 * What a detection has to do before it earns a card.
 *
 * A small model is confidently wrong now and then — a microwave read as a
 * toilet, an earphone read as a bird — and a learner remembers the wrong word
 * far longer than the right one. Two things have to hold: the same label has
 * to keep landing on the same place for four readings, and the model has to
 * have been sure of it on average, well above the floor it needed to be
 * reported at all.
 *
 * Three quarters is deliberately strict. It loses genuine objects in poor
 * light and at a distance, and that is the trade: a learner forgives an app
 * that says nothing far more easily than one that teaches them the wrong
 * word.
 *
 * Tracks are matched within a label, so a detector that cannot decide between
 * two names never accumulates the readings for either, and nothing is shown
 * until it settles.
 */
const MIN_HITS_TO_CONFIRM = 4;
const MIN_CONFIRMED_CONFIDENCE = 0.75;
const VELOCITY_SMOOTHING = 0.55;

/** Enough readings, and enough certainty across them. */
function isConfirmed(track: ObjectTrack) {
  return (
    track.hits >= MIN_HITS_TO_CONFIRM &&
    track.confidenceSum / track.hits >= MIN_CONFIRMED_CONFIDENCE
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
  /** Mean confidence across the readings that built this track. */
  confidenceSum: number;
  id: string;
  label: string;
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

  return {
    height:
      previous.velocity.height * VELOCITY_SMOOTHING +
      currentVelocity.height * (1 - VELOCITY_SMOOTHING),
    width:
      previous.velocity.width * VELOCITY_SMOOTHING +
      currentVelocity.width * (1 - VELOCITY_SMOOTHING),
    x:
      previous.velocity.x * VELOCITY_SMOOTHING +
      currentVelocity.x * (1 - VELOCITY_SMOOTHING),
    y:
      previous.velocity.y * VELOCITY_SMOOTHING +
      currentVelocity.y * (1 - VELOCITY_SMOOTHING),
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
        1,
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
        hits: (matchingTrack?.hits ?? 0) + 1,
        id,
        label: object.label,
        lastObservedBounds: bounds,
        lastSeenAtMs: nowMs,
        velocity,
      };

      matchedTrackIds.add(id);
      nextTracks.set(id, track);
      if (!isConfirmed(track)) return;

      trackedObjects.push({
        ...object,
        id,
        bounds: projectBounds(bounds, velocity, predictionHorizonMs),
      });
    });

    availableTracks.forEach(track => {
      if (matchedTrackIds.has(track.id)) return;

      const missingForMs = nowMs - track.lastSeenAtMs;
      if (missingForMs > MISSING_TRACK_RETENTION_MS) return;

      nextTracks.set(track.id, track);
      if (!isConfirmed(track)) return;

      trackedObjects.push({
        bounds: projectBounds(
          track.lastObservedBounds,
          track.velocity,
          Math.min(missingForMs, MAX_PREDICTION_HORIZON_MS),
        ),
        confidence: track.confidence,
        id: track.id,
        label: track.label,
      });
    });

    this.tracks = nextTracks;
    return { ...frame, objects: trackedObjects };
  }
}
