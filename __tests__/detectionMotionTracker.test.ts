import type { DetectionFrame } from '../src/features/learning/domain/DetectedObject';
import { DetectionMotionTracker } from '../src/features/learning/presentation/tracking/DetectionMotionTracker';

function frame(x: number, inferenceTimeMs = 100): DetectionFrame {
  return {
    inferenceTimeMs,
    objects: [
      {
        bounds: { height: 0.2, width: 0.2, x, y: 0.3 },
        confidence: 0.9,
        id: 'unstable-native-id',
        label: 'chair',
      },
    ],
    sourceHeight: 180,
    sourceWidth: 320,
  };
}

const emptyFrame: DetectionFrame = {
  inferenceTimeMs: 100,
  objects: [],
  sourceHeight: 180,
  sourceWidth: 320,
};

describe('DetectionMotionTracker', () => {
  it('keeps a stable id and predicts motion between detector results', () => {
    const tracker = new DetectionMotionTracker();
    const first = tracker.update(frame(0.1), 1_000);
    const second = tracker.update(frame(0.2), 1_100);

    expect(second.objects[0].id).toBe(first.objects[0].id);
    expect(second.objects[0].bounds.x).toBeGreaterThan(0.2);
  });

  it('briefly retains a missing object to avoid layer flicker', () => {
    const tracker = new DetectionMotionTracker();
    const detected = tracker.update(frame(0.1), 1_000);
    const brieflyMissing = tracker.update(emptyFrame, 1_200);
    const expired = tracker.update(emptyFrame, 1_400);

    expect(brieflyMissing.objects[0].id).toBe(detected.objects[0].id);
    expect(expired.objects).toEqual([]);
  });

  it('resets its stable identifiers with the camera session', () => {
    const tracker = new DetectionMotionTracker();

    tracker.update(frame(0.1), 1_000);
    tracker.reset();

    expect(tracker.update(frame(0.1), 2_000).objects[0].id).toBe('chair-1');
  });
});
