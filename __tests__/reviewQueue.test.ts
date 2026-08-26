import { getWordsToReview } from '../src/features/learning/domain/ReviewQueue';

const NOW = 1_700_000_000_000;
const A_DAY = 24 * 60 * 60 * 1000;

describe('review queue', () => {
  it('asks for a word again a day after it was met', () => {
    const due = getWordsToReview(
      [
        { label: 'bottle', seenAtMs: NOW - A_DAY - 1000 },
        { label: 'chair', seenAtMs: NOW - 60_000 },
      ],
      [],
      NOW,
    );

    expect(due.map(entry => entry.label)).toEqual(['bottle']);
  });

  it('asks for a missed word straight away', () => {
    const due = getWordsToReview(
      [{ label: 'bottle', seenAtMs: NOW - 60_000 }],
      [
        {
          label: 'bottle',
          status: 'missed' as const,
          attemptedAtMs: NOW - 30_000,
        },
      ],
      NOW,
    );

    expect(due).toHaveLength(1);
  });

  it('leaves a word alone once it has been said right', () => {
    const due = getWordsToReview(
      [{ label: 'bottle', seenAtMs: NOW - A_DAY * 3 }],
      [
        {
          label: 'bottle',
          status: 'matched' as const,
          attemptedAtMs: NOW - A_DAY,
        },
      ],
      NOW,
    );

    expect(due).toHaveLength(0);
  });

  it('has nothing to ask for when nothing has been seen', () => {
    expect(getWordsToReview([], [], NOW)).toEqual([]);
  });
});
