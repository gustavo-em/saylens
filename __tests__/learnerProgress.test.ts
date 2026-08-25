import {
  EMPTY_LEARNER_PROGRESS,
  experienceForLevel,
  getExperience,
  getLevel,
  getLevelProgress,
  getStreakDays,
  recordFoundLabels,
  sanitizeLearnerProgress,
  startOfDay,
} from '../src/features/learning/domain/LearnerProgress';

const DAY_MS = 24 * 60 * 60 * 1000;
const today = new Date(2026, 7, 25, 14, 30).getTime();

describe('learner progress', () => {
  it('keeps every label found, without repeating one', () => {
    const first = recordFoundLabels(EMPTY_LEARNER_PROGRESS, ['Cup'], today);
    const second = recordFoundLabels(first, ['cup', ' bottle '], today);

    expect(second.foundLabels).toEqual(['cup', 'bottle']);
    expect(second.streakDays).toBe(1);
  });

  it('leaves the progress untouched when nothing is new today', () => {
    const first = recordFoundLabels(EMPTY_LEARNER_PROGRESS, ['cup'], today);

    expect(recordFoundLabels(first, ['cup'], today + 1000)).toBe(first);
    expect(recordFoundLabels(first, ['  '], today)).toBe(first);
  });

  it('counts a day in a row and starts over after a gap', () => {
    const first = recordFoundLabels(EMPTY_LEARNER_PROGRESS, ['cup'], today);
    const nextDay = recordFoundLabels(first, ['bottle'], today + DAY_MS);
    const afterGap = recordFoundLabels(nextDay, ['chair'], today + 4 * DAY_MS);

    expect(nextDay.streakDays).toBe(2);
    expect(nextDay.lastFoundDayMs).toBe(startOfDay(today + DAY_MS));
    expect(afterGap.streakDays).toBe(1);
  });

  it('drops a streak that was not fed yesterday', () => {
    const progress = recordFoundLabels(EMPTY_LEARNER_PROGRESS, ['cup'], today);

    expect(getStreakDays(progress, today)).toBe(1);
    expect(getStreakDays(progress, today + DAY_MS)).toBe(1);
    expect(getStreakDays(progress, today + 2 * DAY_MS)).toBe(0);
    expect(getStreakDays(EMPTY_LEARNER_PROGRESS, today)).toBe(0);
  });

  it('turns finds and matched words into experience and levels', () => {
    expect(getExperience(10, 2)).toBe(130);
    expect(getLevel(0)).toBe(1);
    expect(getLevel(experienceForLevel(2))).toBe(2);
    expect(getLevel(experienceForLevel(8))).toBe(8);
    expect(getLevel(experienceForLevel(8) - 1)).toBe(7);

    const progress = getLevelProgress(experienceForLevel(3) + 20);
    expect(progress.level).toBe(3);
    expect(progress.intoLevel).toBe(20);
    expect(progress.levelSpan).toBe(
      experienceForLevel(4) - experienceForLevel(3),
    );
  });

  it('drops malformed stored progress', () => {
    expect(sanitizeLearnerProgress(null)).toEqual(EMPTY_LEARNER_PROGRESS);
    expect(
      sanitizeLearnerProgress({
        foundLabels: ['Cup', 'cup', '  ', 7],
        streakDays: -3,
        lastFoundDayMs: today,
      }),
    ).toEqual({
      foundLabels: ['cup'],
      streakDays: 0,
      lastFoundDayMs: startOfDay(today),
    });
    expect(
      sanitizeLearnerProgress({
        foundLabels: ['cup'],
        streakDays: 4,
        lastFoundDayMs: 0,
      }),
    ).toEqual({ foundLabels: ['cup'], streakDays: 0, lastFoundDayMs: 0 });
  });
});
