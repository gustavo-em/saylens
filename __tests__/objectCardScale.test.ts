import {
  getNearness,
  getObjectCardScale,
  getObjectCardTilt,
  OBJECT_CARD_BASE_SCALE,
} from '../src/features/learning/presentation/animation/objectCardScale';

const viewport = { width: 360, height: 640 };

describe('object card scale', () => {
  it('grows the card as the object gets closer', () => {
    const far = getObjectCardScale({ width: 40, height: 60 }, viewport);
    const near = getObjectCardScale({ width: 260, height: 460 }, viewport);

    expect(near).toBeGreaterThan(far);
    expect(far).toBeLessThan(OBJECT_CARD_BASE_SCALE);
    expect(near).toBeGreaterThan(OBJECT_CARD_BASE_SCALE);
  });

  it('keeps the card between its smallest and largest size', () => {
    const tiny = getObjectCardScale({ width: 1, height: 1 }, viewport);
    const huge = getObjectCardScale({ width: 3600, height: 6400 }, viewport);

    expect(tiny).toBeCloseTo(0.68, 5);
    expect(huge).toBeCloseTo(1.12, 5);
  });

  it('settles on steps so a jittering box does not resize the card', () => {
    expect(getObjectCardScale({ width: 120, height: 200 }, viewport)).toBe(
      getObjectCardScale({ width: 121, height: 200 }, viewport),
    );
  });

  it('falls back to the resting size before the viewport is measured', () => {
    expect(
      getObjectCardScale({ width: 120, height: 200 }, { width: 0, height: 0 }),
    ).toBe(OBJECT_CARD_BASE_SCALE);
    expect(getObjectCardScale({ width: 0, height: 0 }, viewport)).toBe(
      OBJECT_CARD_BASE_SCALE,
    );
  });

  it('reads nearness from how much of the frame the object fills', () => {
    expect(getNearness({ width: 1, height: 1 }, viewport)).toBe(0);
    expect(getNearness({ width: 3600, height: 6400 }, viewport)).toBe(1);
  });
});

describe('object card tilt', () => {
  it('opens a near object further than a distant one', () => {
    const near = getObjectCardTilt({ width: 260, height: 460 }, viewport);
    const far = getObjectCardTilt({ width: 40, height: 60 }, viewport);

    expect(near).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(0);
  });

  it('never turns the card towards the object it is hinged on', () => {
    // The direction is the placement's to decide; the size of the turn is
    // always positive.
    expect(
      getObjectCardTilt({ width: 1, height: 1 }, viewport),
    ).toBeGreaterThan(0);
  });

  it('stays square before the viewport is measured', () => {
    expect(
      getObjectCardTilt({ width: 120, height: 200 }, { width: 0, height: 0 }),
    ).toBe(0);
  });
});
