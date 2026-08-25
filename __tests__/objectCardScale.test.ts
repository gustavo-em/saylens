import {
  getObjectCardScale,
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

    expect(tiny).toBeCloseTo(0.78, 5);
    expect(huge).toBeCloseTo(1.02, 5);
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
});
