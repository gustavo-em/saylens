import { getDaysSinceLastOpen } from '../src/features/learning/domain/VisitGap';

const A_DAY = 24 * 60 * 60 * 1000;
const NOON = new Date(2026, 7, 27, 12, 0, 0).getTime();

describe('visit gap', () => {
  it('has nothing to report on a first visit', () => {
    expect(getDaysSinceLastOpen(null, NOON)).toBeNull();
    expect(getDaysSinceLastOpen(0, NOON)).toBeNull();
  });

  it('counts a second visit on the same day as no days', () => {
    expect(getDaysSinceLastOpen(NOON - 3 * 60 * 60 * 1000, NOON)).toBe(0);
  });

  it('counts the next morning as one day, however few hours passed', () => {
    const lateLastNight = new Date(2026, 7, 26, 23, 30, 0).getTime();
    const thisMorning = new Date(2026, 7, 27, 8, 0, 0).getTime();

    expect(getDaysSinceLastOpen(lateLastNight, thisMorning)).toBe(1);
  });

  it('counts a week away as seven days', () => {
    expect(getDaysSinceLastOpen(NOON - 7 * A_DAY, NOON)).toBe(7);
  });

  it('never reports a visit from the future as negative', () => {
    expect(getDaysSinceLastOpen(NOON + 5 * A_DAY, NOON)).toBe(0);
  });
});
