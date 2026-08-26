import {
  getPronunciationStatus,
  getRestingUntilMs,
  isResting,
  matchesPronunciationFilter,
  recordPronunciationAttempt,
  sanitizePronunciationProgress,
} from '../src/features/learning/domain/PronunciationProgress';

describe('pronunciation progress', () => {
  it('reports a word nobody has tried as untried', () => {
    expect(getPronunciationStatus([], 'bottle')).toBe('untried');
  });

  it('records a match and a miss under the same label casing', () => {
    const matched = recordPronunciationAttempt([], ' Bottle ', true, 10);
    expect(getPronunciationStatus(matched, 'bottle')).toBe('matched');

    const missed = recordPronunciationAttempt([], 'BOTTLE', false, 10);
    expect(getPronunciationStatus(missed, 'bottle')).toBe('missed');
  });

  it('keeps a matched word matched after a later slip', () => {
    const matched = recordPronunciationAttempt([], 'bottle', true, 10);
    const afterSlip = recordPronunciationAttempt(matched, 'bottle', false, 20);

    expect(afterSlip).toBe(matched);
    expect(getPronunciationStatus(afterSlip, 'bottle')).toBe('matched');
  });

  it('upgrades a missed word once it is said right', () => {
    const missed = recordPronunciationAttempt([], 'bottle', false, 10);
    const matched = recordPronunciationAttempt(missed, 'bottle', true, 20);

    expect(matched).toHaveLength(1);
    expect(getPronunciationStatus(matched, 'bottle')).toBe('matched');
  });

  it('ignores an empty label', () => {
    const progress = recordPronunciationAttempt([], '   ', true, 10);
    expect(progress).toHaveLength(0);
  });

  it('keeps every word under the all filter', () => {
    expect(matchesPronunciationFilter('all', 'missed')).toBe(true);
    expect(matchesPronunciationFilter('matched', 'missed')).toBe(false);
    expect(matchesPronunciationFilter('untried', 'untried')).toBe(true);
  });

  it('drops malformed and duplicated stored entries', () => {
    const progress = sanitizePronunciationProgress([
      { label: 'bottle', status: 'matched', attemptedAtMs: 10 },
      { label: 'bottle', status: 'missed', attemptedAtMs: 20 },
      { label: 'cup', status: 'unknown', attemptedAtMs: 30 },
      { label: '  ', status: 'matched', attemptedAtMs: 40 },
      { label: 'chair', status: 'missed', attemptedAtMs: Number.NaN },
      'nope',
    ]);

    expect(progress).toEqual([
      { label: 'bottle', status: 'matched', attemptedAtMs: 10 },
    ]);
    expect(sanitizePronunciationProgress(null)).toEqual([]);
  });
});

describe('resting a word after repeated misses', () => {
  const NOW = 1_700_000_000_000;
  const A_DAY = 24 * 60 * 60 * 1000;

  function missTwice() {
    let progress = recordPronunciationAttempt([], 'bottle', false, NOW - 2000);
    progress = recordPronunciationAttempt(
      progress,
      'bottle',
      false,
      NOW - 1000,
    );
    return progress;
  }

  it('keeps a word available for the first two misses', () => {
    expect(isResting(missTwice(), 'bottle', NOW)).toBe(false);
  });

  it('sets the word aside on the third miss in a row', () => {
    const progress = recordPronunciationAttempt(
      missTwice(),
      'bottle',
      false,
      NOW,
    );

    expect(isResting(progress, 'bottle', NOW)).toBe(true);
    expect(getRestingUntilMs(progress[0])).toBe(NOW + A_DAY);
  });

  it('brings the word back the next day', () => {
    const progress = recordPronunciationAttempt(
      missTwice(),
      'bottle',
      false,
      NOW,
    );

    expect(isResting(progress, 'bottle', NOW + A_DAY + 1)).toBe(false);
  });

  it('forgets the misses as soon as the word is said right', () => {
    let progress = missTwice();
    progress = recordPronunciationAttempt(progress, 'bottle', true, NOW);
    progress = recordPronunciationAttempt(progress, 'bottle', false, NOW + 10);

    expect(isResting(progress, 'bottle', NOW + 20)).toBe(false);
  });
});
