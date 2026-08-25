export interface PronunciationAttempt {
  /** What the recogniser thought it heard, best guess first. */
  heard: string[];
  score: number;
  matched: boolean;
}

export const MATCH_THRESHOLD = 0.75;

function normalise(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

/** Levenshtein distance, used to forgive a slightly mangled transcript. */
function editDistance(a: string, b: string) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];

    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }

  return previous[b.length];
}

export function similarity(expected: string, heard: string) {
  const left = normalise(expected);
  const right = normalise(heard);

  if (left.length === 0 || right.length === 0) return 0;

  const longest = Math.max(left.length, right.length);
  return 1 - editDistance(left, right) / longest;
}

/**
 * Scores an attempt against the expected word. The recogniser returns several
 * guesses, so the closest one counts: hearing the right word as the second
 * guess still means it was said correctly.
 */
export function scoreAttempt(
  expected: string,
  heard: readonly string[],
): PronunciationAttempt {
  const score = heard.reduce(
    (best, candidate) => Math.max(best, similarity(expected, candidate)),
    0,
  );

  return {
    heard: [...heard],
    score,
    matched: score >= MATCH_THRESHOLD,
  };
}
