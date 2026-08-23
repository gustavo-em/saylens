import type {
  DetectedObject,
  DetectionFrame,
  NormalizedBounds,
} from '../../domain/DetectedObject';

const MAX_MATCH_DISTANCE = 0.32;
const MAX_PREDICTION_HORIZON_MS = 180;
const MISSING_TRACK_RETENTION_MS = 320;
const VELOCITY_SMOOTHING = 0.55;

interface MotionVector {
  height: number;
  width: number;
  x: number;
  y: number;
}

interface ObjectTrack {
  confidence: number;
  id: string;
  label: string;
  lastObservedBounds: NormalizedBounds;
  lastSeenAtMs: number;
  velocity: MotionVector;
}

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(Math.max(value, minimum), maximum);
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

  return {
    x: clamp(bounds.x + velocity.x * horizonMs, 0, 1 - width),
    y: clamp(bounds.y + velocity.y * horizonMs, 0, 1 - height),
    width,
    height,
  };
}

const ZERO_VELOCITY: MotionVector = { height: 0, width: 0, x: 0, y: 0 };

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
      const matchingTrack = availableTracks
        .filter(
          track =>
            track.label === object.label && !matchedTrackIds.has(track.id),
        )
        .map(track => ({
          distance: centerDistance(track.lastObservedBounds, object.bounds),
          track,
        }))
        .filter(candidate => candidate.distance <= MAX_MATCH_DISTANCE)
        .sort((a, b) => a.distance - b.distance)[0]?.track;

      const id = matchingTrack?.id ?? `${object.label}-${this.nextTrackId++}`;
      const elapsedMs = Math.max(
        nowMs - (matchingTrack?.lastSeenAtMs ?? nowMs),
        1,
      );
      const velocity = matchingTrack
        ? calculateVelocity(matchingTrack, object.bounds, elapsedMs)
        : ZERO_VELOCITY;
      const track: ObjectTrack = {
        confidence: object.confidence,
        id,
        label: object.label,
        lastObservedBounds: object.bounds,
        lastSeenAtMs: nowMs,
        velocity,
      };

      matchedTrackIds.add(id);
      nextTracks.set(id, track);
      trackedObjects.push({
        ...object,
        id,
        bounds: projectBounds(object.bounds, velocity, predictionHorizonMs),
      });
    });

    availableTracks.forEach(track => {
      if (matchedTrackIds.has(track.id)) return;

      const missingForMs = nowMs - track.lastSeenAtMs;
      if (missingForMs > MISSING_TRACK_RETENTION_MS) return;

      nextTracks.set(track.id, track);
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
