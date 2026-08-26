import {
  getCountUpDurationMs,
  getCountUpValue,
} from '../src/features/learning/presentation/animation/countUp';

const COUNT_UP_DURATION_MS = getCountUpDurationMs(48);

describe('count up', () => {
  it('starts at nothing and ends at the total', () => {
    expect(getCountUpValue(48, 0)).toBe(0);
    expect(getCountUpValue(48, COUNT_UP_DURATION_MS)).toBe(48);
  });

  it('never runs past the total, however late it is read', () => {
    expect(getCountUpValue(48, COUNT_UP_DURATION_MS * 5)).toBe(48);
  });

  it('gives a longer climb to a bigger total', () => {
    expect(getCountUpDurationMs(40)).toBeGreaterThan(getCountUpDurationMs(3));
  });

  it('slows down as it arrives', () => {
    const duration = getCountUpDurationMs(100);
    const firstHalf = getCountUpValue(100, duration / 2, duration);
    const secondHalf = 100 - firstHalf;

    // Eased out: more ground is covered early than late.
    expect(firstHalf).toBeGreaterThan(secondHalf);
  });

  it('only ever climbs', () => {
    let previous = 0;

    for (let elapsed = 0; elapsed <= getCountUpDurationMs(15); elapsed += 40) {
      const value = getCountUpValue(15, elapsed);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it('has nothing to count when the list is empty', () => {
    expect(getCountUpValue(0, 0)).toBe(0);
  });
});
