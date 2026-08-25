export type PronunciationStatus = 'untried' | 'matched' | 'missed';

export interface PronunciationProgressEntry {
  /** Detector label, so progress follows the word across languages. */
  label: string;
  status: Exclude<PronunciationStatus, 'untried'>;
  attemptedAtMs: number;
}

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
