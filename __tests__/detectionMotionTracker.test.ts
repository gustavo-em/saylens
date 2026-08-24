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
    tracker.update(frame(0.1), 1_000);
    const second = tracker.update(frame(0.15), 1_100);
    const third = tracker.update(frame(0.2), 1_200);

    expect(third.objects[0].id).toBe(second.objects[0].id);
    expect(third.objects[0].bounds.x).toBeGreaterThan(0.2);
  });

  it('waits for a second sighting before showing a layer', () => {
    const tracker = new DetectionMotionTracker();

    expect(tracker.update(frame(0.1), 1_000).objects).toEqual([]);
    expect(tracker.update(frame(0.12), 1_100).objects).toHaveLength(1);
  });

  it('ignores a label that only appears in a single result', () => {
    const tracker = new DetectionMotionTracker();

    tracker.update(frame(0.1), 1_000);

    expect(tracker.update(emptyFrame, 1_100).objects).toEqual([]);
    expect(tracker.update(emptyFrame, 1_200).objects).toEqual([]);
  });

  it('holds a confirmed object through a gap in the detector results', () => {
    const tracker = new DetectionMotionTracker();
    tracker.update(frame(0.1), 1_000);
    const confirmed = tracker.update(frame(0.12), 1_100);
    const missing = tracker.update(emptyFrame, 1_600);

    expect(missing.objects[0].id).toBe(confirmed.objects[0].id);
  });

  it('drops a confirmed object once it stays missing', () => {
    const tracker = new DetectionMotionTracker();
    tracker.update(frame(0.1), 1_000);
    tracker.update(frame(0.12), 1_100);

    expect(tracker.update(emptyFrame, 2_100).objects).toEqual([]);
  });

  it('does not hand a track to a second object of the same label', () => {
    const tracker = new DetectionMotionTracker();
    tracker.update(frame(0.1), 1_000);
    const confirmed = tracker.update(frame(0.1), 1_100);
    // Far enough that neither the boxes overlap nor the centres sit within one
    // object's own width, so this is a second object rather than the first one
    // having moved.
    tracker.update(frame(0.7), 1_200);
    const elsewhere = tracker.update(frame(0.7), 1_300);
    const moved = elsewhere.objects.find(object => object.bounds.x > 0.5);

    expect(moved).toBeDefined();
    expect(moved!.id).not.toBe(confirmed.objects[0].id);
  });

  it('resets its stable identifiers with the camera session', () => {
    const tracker = new DetectionMotionTracker();

    tracker.update(frame(0.1), 1_000);
    tracker.update(frame(0.1), 1_100);
    tracker.reset();

    tracker.update(frame(0.1), 2_000);

    expect(tracker.update(frame(0.1), 2_100).objects[0].id).toBe('chair-1');
  });
});
