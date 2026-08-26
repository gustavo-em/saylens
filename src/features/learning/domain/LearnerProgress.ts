export interface LearnerProgress {
  /** Every detector label ever found, so a collection never loses an entry. */
  foundLabels: readonly string[];
  streakDays: number;
  /** Start of the last day something was found, in local time. */
  lastFoundDayMs: number;
}

export const EMPTY_LEARNER_PROGRESS: LearnerProgress = {
  foundLabels: [],
  streakDays: 0,
  lastFoundDayMs: 0,
};

const DAY_MS = 24 * 60 * 60 * 1000;
const XP_PER_FOUND_OBJECT = 10;
const XP_PER_MATCHED_WORD = 15;
/**
 * What a level costs, and how much more the next one costs.
 *
 * The catalogue holds eighty words, so a learner who finds every one and says
 * every one correctly earns two thousand points and no more. A curve has to
 * fit inside that: the previous one charged fifty points times the level, which
 * asked seven hundred and fifty for a single level — seventy-five objects —
 * and put everything past level nine out of reach for good.
 *
 * Four objects buy the first level, and each level after costs ten more than
 * the one before. Finding and pronouncing the whole catalogue lands around
 * level seventeen.
 */
const XP_LEVEL_BASE = 40;
const XP_LEVEL_GROWTH = 10;

export function startOfDay(atMs: number): number {
  const date = new Date(atMs);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Adds whatever the camera just saw. The streak counts days in a row with at
 * least one sighting: finding more on the same day changes nothing, missing a
 * day starts the count over.
 */
export function recordFoundLabels(
  progress: LearnerProgress,
  labels: readonly string[],
  foundAtMs: number,
): LearnerProgress {
  const fresh = labels
    .map(label => label.trim().toLowerCase())
    .filter(label => label.length > 0 && !progress.foundLabels.includes(label));
  const today = startOfDay(foundAtMs);

  if (fresh.length === 0 && today === progress.lastFoundDayMs) return progress;

  const daysSinceLastFound =
    progress.lastFoundDayMs === 0
      ? Number.POSITIVE_INFINITY
      : Math.round((today - progress.lastFoundDayMs) / DAY_MS);
  const streakDays =
    daysSinceLastFound === 0
      ? Math.max(progress.streakDays, 1)
      : daysSinceLastFound === 1
      ? progress.streakDays + 1
      : 1;

  return {
    foundLabels: [...progress.foundLabels, ...new Set(fresh)],
    streakDays,
    lastFoundDayMs: today,
  };
}

/** A streak only survives while it is fed: it is stale the day after the last
 * sighting, so the number on screen is never a lie. */
export function getStreakDays(progress: LearnerProgress, atMs: number): number {
  if (progress.lastFoundDayMs === 0) return 0;

  const days = Math.round(
    (startOfDay(atMs) - progress.lastFoundDayMs) / DAY_MS,
  );

  return days <= 1 ? progress.streakDays : 0;
}

export function getExperience(
  foundCount: number,
  matchedPronunciations: number,
): number {
  return (
    foundCount * XP_PER_FOUND_OBJECT +
    matchedPronunciations * XP_PER_MATCHED_WORD
  );
}

/** Experience needed to reach a level: every step before it, added up. */
export function experienceForLevel(level: number): number {
  const steps = Math.max(level - 1, 0);

  return XP_LEVEL_BASE * steps + (XP_LEVEL_GROWTH * steps * (steps - 1)) / 2;
}

export function getLevel(experience: number): number {
  // The sum above is a quadratic in the number of steps taken, so the level is
  // what is left after solving it for that number.
  const points = Math.max(experience, 0);
  const a = XP_LEVEL_GROWTH / 2;
  const b = XP_LEVEL_BASE - XP_LEVEL_GROWTH / 2;
  const steps = (-b + Math.sqrt(b * b + 4 * a * points)) / (2 * a);

  return Math.floor(steps) + 1;
}

/** How far the learner is into the current level, for the progress bar. */
export function getLevelProgress(experience: number) {
  const level = getLevel(experience);
  const floor = experienceForLevel(level);
  const ceiling = experienceForLevel(level + 1);

  return {
    level,
    experience,
    intoLevel: experience - floor,
    levelSpan: ceiling - floor,
  };
}

/** Stored progress is untrusted input, so anything malformed is dropped. */
export function sanitizeLearnerProgress(stored: unknown): LearnerProgress {
  if (typeof stored !== 'object' || stored === null) {
    return EMPTY_LEARNER_PROGRESS;
  }

  const candidate = stored as Partial<LearnerProgress>;
  const foundLabels = Array.isArray(candidate.foundLabels)
    ? Array.from(
        new Set(
          candidate.foundLabels
            .filter((label): label is string => typeof label === 'string')
            .map(label => label.trim().toLowerCase())
            .filter(label => label.length > 0),
        ),
      )
    : [];
  const streakDays =
    typeof candidate.streakDays === 'number' &&
    Number.isFinite(candidate.streakDays) &&
    candidate.streakDays > 0
      ? Math.floor(candidate.streakDays)
      : 0;
  const lastFoundDayMs =
    typeof candidate.lastFoundDayMs === 'number' &&
    Number.isFinite(candidate.lastFoundDayMs) &&
    candidate.lastFoundDayMs > 0
      ? startOfDay(candidate.lastFoundDayMs)
      : 0;

  return {
    foundLabels,
    streakDays: lastFoundDayMs === 0 ? 0 : streakDays,
    lastFoundDayMs,
  };
}
