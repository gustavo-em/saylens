export type PronunciationStatus = 'untried' | 'matched' | 'missed';

export interface PronunciationProgressEntry {
  /** Detector label, so progress follows the word across languages. */
  label: string;
  status: Exclude<PronunciationStatus, 'untried'>;
  attemptedAtMs: number;
  /** Misses in a row. A match clears it, because the word was learned. */
  consecutiveMisses?: number;
}

/**
 * How many times in a row a word may be missed before it is set aside, and for
 * how long.
 *
 * Saying the same word wrong a fourth time in a minute teaches nothing —
 * distance is what fixes a pronunciation, not repetition. The word comes back
 * the next day, and every other word stays available meanwhile.
 */
export const MISSES_BEFORE_RESTING = 3;
export const RESTING_MS = 24 * 60 * 60 * 1000;

/**
 * Records how an attempt went. A match is kept for good: getting the word right
 * once is an achievement, so a later slip does not take the green away. A miss
 * only ever replaces another miss.
 */
export function recordPronunciationAttempt(
  progress: readonly PronunciationProgressEntry[],
  label: string,
  matched: boolean,
  attemptedAtMs: number,
): readonly PronunciationProgressEntry[] {
  const normalized = label.trim().toLowerCase();
  if (normalized.length === 0) return progress;

  const existing = progress.find(entry => entry.label === normalized);
  if (existing?.status === 'matched' && !matched) return progress;

  const entry: PronunciationProgressEntry = {
    label: normalized,
    status: matched ? 'matched' : 'missed',
    attemptedAtMs,
    consecutiveMisses: matched ? 0 : (existing?.consecutiveMisses ?? 0) + 1,
  };

  return [entry, ...progress.filter(item => item.label !== normalized)];
}

export function getPronunciationStatus(
  progress: readonly PronunciationProgressEntry[],
  label: string,
): PronunciationStatus {
  const normalized = label.trim().toLowerCase();
  return (
    progress.find(entry => entry.label === normalized)?.status ?? 'untried'
  );
}

export const pronunciationFilters = [
  'all',
  'matched',
  'untried',
  'missed',
] as const;

export type PronunciationFilter = (typeof pronunciationFilters)[number];

export function matchesPronunciationFilter(
  filter: PronunciationFilter,
  status: PronunciationStatus,
): boolean {
  return filter === 'all' || filter === status;
}

/** Stored progress is untrusted input, so anything malformed is dropped. */
export function sanitizePronunciationProgress(
  stored: unknown,
): PronunciationProgressEntry[] {
  if (!Array.isArray(stored)) return [];

  const seen = new Set<string>();

  return stored
    .filter(
      (entry): entry is PronunciationProgressEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as PronunciationProgressEntry).label === 'string' &&
        (entry as PronunciationProgressEntry).label.trim().length > 0 &&
        ((entry as PronunciationProgressEntry).status === 'matched' ||
          (entry as PronunciationProgressEntry).status === 'missed') &&
        Number.isFinite((entry as PronunciationProgressEntry).attemptedAtMs),
    )
    .map(entry => ({
      label: entry.label.trim().toLowerCase(),
      status: entry.status,
      attemptedAtMs: entry.attemptedAtMs,
    }))
    .filter(entry => {
      if (seen.has(entry.label)) return false;
      seen.add(entry.label);
      return true;
    });
}

/**
 * Whether a word is resting, and until when.
 *
 * A word rests after three misses in a row, for a day from the last of them.
 * Nothing else is locked: the learner still has every other word they have
 * met, which is the point — the block is on repetition, not on practising.
 */
export function getRestingUntilMs(
  entry: PronunciationProgressEntry | undefined,
): number | null {
  if (entry == null || entry.status === 'matched') return null;
  if ((entry.consecutiveMisses ?? 0) < MISSES_BEFORE_RESTING) return null;

  return entry.attemptedAtMs + RESTING_MS;
}

export function isResting(
  progress: readonly PronunciationProgressEntry[],
  label: string,
  nowMs: number,
): boolean {
  const until = getRestingUntilMs(findEntry(progress, label));

  return until != null && nowMs < until;
}

function findEntry(
  progress: readonly PronunciationProgressEntry[],
  label: string,
) {
  const normalized = label.trim().toLowerCase();

  return progress.find(entry => entry.label === normalized);
}
