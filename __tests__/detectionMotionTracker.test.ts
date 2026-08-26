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

/** Feeds the readings a track needs before it is allowed on screen. */
function confirm(tracker: DetectionMotionTracker, x = 0.1, startAtMs = 1_000) {
  let result = tracker.update(frame(x), startAtMs);
  for (let index = 1; index < 4; index += 1) {
    result = tracker.update(frame(x), startAtMs + index * 100);
  }

  return result;
}

describe('DetectionMotionTracker', () => {
  it('holds a still box steady when the detector jitters', () => {
    const tracker = new DetectionMotionTracker();
    const settled = confirm(tracker);
    // A still object still re-measures a fraction of a percent each result.
    const jittered = tracker.update(frame(0.103), 1_400);

    expect(jittered.objects[0].bounds.x).toBe(settled.objects[0].bounds.x);
  });

  it('keeps a stable id and predicts motion between detector results', () => {
    const tracker = new DetectionMotionTracker();
    confirm(tracker);
    const second = tracker.update(frame(0.15), 1_400);
    const third = tracker.update(frame(0.2), 1_500);

    expect(third.objects[0].id).toBe(second.objects[0].id);
    // Smoothing damps the raw measurement, so the box trails the detector
    // instead of matching it exactly, but it still travels in the same
    // direction.
    expect(third.objects[0].bounds.x).toBeGreaterThan(
      second.objects[0].bounds.x,
    );
  });

  it('waits for four sightings before showing a layer', () => {
    const tracker = new DetectionMotionTracker();

    expect(tracker.update(frame(0.1), 1_000).objects).toEqual([]);
    expect(tracker.update(frame(0.11), 1_100).objects).toEqual([]);
    expect(tracker.update(frame(0.12), 1_200).objects).toEqual([]);
    expect(tracker.update(frame(0.13), 1_300).objects).toHaveLength(1);
  });

  it('never shows a reading the detector was unsure of', () => {
    const tracker = new DetectionMotionTracker();
    const unsure = (x: number): DetectionFrame => ({
      ...frame(x),
      objects: [{ ...frame(x).objects[0], confidence: 0.7 }],
    });

    // Four sightings, every one of them above the detector's floor and below
    // what this app will put a word on.
    tracker.update(unsure(0.1), 1_000);
    tracker.update(unsure(0.11), 1_100);
    tracker.update(unsure(0.12), 1_200);

    expect(tracker.update(unsure(0.13), 1_300).objects).toEqual([]);
  });

  it('ignores a label that only appears in a single result', () => {
    const tracker = new DetectionMotionTracker();

    tracker.update(frame(0.1), 1_000);

    expect(tracker.update(emptyFrame, 1_100).objects).toEqual([]);
    expect(tracker.update(emptyFrame, 1_200).objects).toEqual([]);
  });

  it('holds a confirmed object through a gap in the detector results', () => {
    const tracker = new DetectionMotionTracker();
    const confirmed = confirm(tracker);
    const missing = tracker.update(emptyFrame, 1_800);

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
    const confirmed = confirm(tracker);
    // Far enough that neither the boxes overlap nor the centres sit within one
    // object's own width, so this is a second object rather than the first one
    // having moved.
    const elsewhere = confirm(tracker, 0.7, 1_400);
    const moved = elsewhere.objects.find(object => object.bounds.x > 0.5);

    expect(moved).toBeDefined();
    expect(moved!.id).not.toBe(confirmed.objects[0].id);
  });

  it('resets its stable identifiers with the camera session', () => {
    const tracker = new DetectionMotionTracker();

    confirm(tracker);
    tracker.reset();

    expect(confirm(tracker, 0.1, 2_000).objects[0].id).toBe('chair-1');
  });
});
