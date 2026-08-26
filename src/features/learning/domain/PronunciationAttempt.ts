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

/** One string split into the part that matched, the part that did not, and the
 * part that matched again. */
export interface DivergentParts {
  before: string;
  wrong: string;
  after: string;
}

export interface PronunciationDivergence {
  expected: DivergentParts;
  heard: DivergentParts;
}

/**
 * Where a spoken word parted from the written one.
 *
 * A score says how wrong an attempt was; it never says what to repeat. This
 * finds the stretch in the middle that differs — everything up to the first
 * mismatch matched, and everything after the last one matched too — so the
 * screen can point at the syllable instead of quoting a percentage.
 *
 * The comparison ignores case and accents, and the slices come from the
 * original strings, so what is shown is what was written and what was heard.
 */
export function describeDivergence(
  expected: string,
  heard: string,
): PronunciationDivergence | null {
  const expectedKey = normalise(expected);
  const heardKey = normalise(heard);

  if (expectedKey.length === 0 || heardKey.length === 0) return null;
  if (expectedKey === heardKey) return null;

  const shortest = Math.min(expectedKey.length, heardKey.length);

  let prefix = 0;
  while (prefix < shortest && expectedKey[prefix] === heardKey[prefix]) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < shortest - prefix &&
    expectedKey[expectedKey.length - 1 - suffix] ===
      heardKey[heardKey.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  return {
    expected: split(expected, expectedKey, prefix, suffix),
    heard: split(heard, heardKey, prefix, suffix),
  };
}

/**
 * The normalised string is what the comparison ran on, and it can be shorter
 * than the original once punctuation is dropped, so the slice is taken by
 * walking the original until the same number of comparable characters has
 * gone by.
 */
function split(
  original: string,
  key: string,
  prefix: number,
  suffix: number,
): DivergentParts {
  const start = originalIndex(original, prefix);
  const end = originalIndex(original, key.length - suffix);

  return {
    before: original.slice(0, start),
    wrong: original.slice(start, end),
    after: original.slice(end),
  };
}

function originalIndex(original: string, comparableCount: number) {
  if (comparableCount <= 0) return 0;

  let seen = 0;
  for (let index = 0; index < original.length; index += 1) {
    if (normalise(original[index]).length > 0) seen += 1;
    if (seen === comparableCount) return index + 1;
  }

  return original.length;
}
