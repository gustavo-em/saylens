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

  it('makes a middling reading hold still longer than a confident one', () => {
    const tracker = new DetectionMotionTracker();
    const middling = (x: number): DetectionFrame => ({
      ...frame(x),
      objects: [{ ...frame(x).objects[0], confidence: 0.62 }],
    });

    // Four sightings earn a confident reading a card, and this one nothing.
    for (let index = 0; index < 4; index += 1) {
      const result = tracker.update(
        middling(0.1 + index * 0.01),
        1_000 + index * 100,
      );

      expect(result.objects).toEqual([]);
    }

    // It keeps saying the same thing about the same place, and that is the
    // other half of the evidence.
    tracker.update(middling(0.14), 1_400);
    tracker.update(middling(0.15), 1_500);

    expect(tracker.update(middling(0.16), 1_600).objects).toHaveLength(1);
  });

  it('never shows a reading the detector was barely sure of', () => {
    const tracker = new DetectionMotionTracker();
    const barely = (x: number): DetectionFrame => ({
      ...frame(x),
      objects: [{ ...frame(x).objects[0], confidence: 0.42 }],
    });
    let result = tracker.update(barely(0.1), 1_000);

    // Twenty sightings, well past the longest the ladder ever asks for.
    for (let index = 1; index < 20; index += 1) {
      result = tracker.update(barely(0.1 + index * 0.002), 1_000 + index * 100);
    }

    expect(result.objects).toEqual([]);
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

  it('holds a card on screen while a hand reaches for it', () => {
    const tracker = new DetectionMotionTracker();
    confirm(tracker);

    // Reaching for the practise button covers the object, so the detector
    // loses it at the worst possible moment.
    expect(tracker.update(emptyFrame, 2_600).objects).toHaveLength(1);
    expect(tracker.update(emptyFrame, 3_700).objects).toEqual([]);
  });

  it('does not fling a box when two readings land in the same instant', () => {
    const tracker = new DetectionMotionTracker();
    // Several workers can return within a millisecond of each other. Dividing
    // the displacement by that gap used to produce a velocity two orders of
    // magnitude too large, and the projection threw the box off screen.
    let result = tracker.update(frame(0.1), 1_000);
    result = tracker.update(frame(0.12), 1_001);
    result = tracker.update(frame(0.14), 1_002);
    result = tracker.update(frame(0.16), 1_003);
    // Three milliseconds is not evidence that anything held still, so the
    // reading that earns the card is the one after the burst — and it is the
    // one carrying the velocity this guards against.
    result = tracker.update(frame(0.18), 1_300);

    expect(result.objects[0].bounds.x).toBeLessThan(0.4);
    expect(result.objects[0].bounds.x).toBeGreaterThan(0);
  });

  it('refuses a burst of readings that all land in the same instant', () => {
    const tracker = new DetectionMotionTracker();

    tracker.update(frame(0.1), 1_000);
    tracker.update(frame(0.1), 1_001);
    tracker.update(frame(0.1), 1_002);
    // Six workers can finish together. Counting those as six sightings would
    // put a card on screen for something seen for two milliseconds.
    expect(tracker.update(frame(0.1), 1_003).objects).toEqual([]);
  });

  it('earns a card in three sightings when the detector is slow', () => {
    const tracker = new DetectionMotionTracker();

    // A warm phone manages about five readings a second. The card is earned in
    // the time the floor asks for rather than in the readings a cool phone
    // would have delivered by then.
    expect(tracker.update(frame(0.1), 1_000).objects).toEqual([]);
    expect(tracker.update(frame(0.1), 1_200).objects).toEqual([]);
    expect(tracker.update(frame(0.1), 1_400).objects).toHaveLength(1);
  });

  it('never believes an object crossed the frame between two readings', () => {
    const tracker = new DetectionMotionTracker();
    confirm(tracker, 0.1);
    // A box that leaps most of the width is a mismatch or a wobble, not
    // motion, so the projection is not allowed to run with it.
    const leapt = tracker.update(frame(0.42), 1_400);

    expect(leapt.objects[0].bounds.x).toBeLessThan(0.6);
  });
});
