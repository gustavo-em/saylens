import {
  MATCH_THRESHOLD,
  scoreAttempt,
  similarity,
} from '../src/features/learning/domain/PronunciationAttempt';

describe('similarity', () => {
  it('ignores case, accents and punctuation', () => {
    expect(similarity('Café', 'cafe!')).toBe(1);
  });

  it('falls with each wrong letter', () => {
    expect(similarity('bottle', 'bottle')).toBe(1);
    expect(similarity('bottle', 'bottel')).toBeLessThan(1);
    expect(similarity('bottle', 'keyboard')).toBeLessThan(0.5);
  });

  it('scores nothing against an empty transcript', () => {
    expect(similarity('bottle', '   ')).toBe(0);
  });
});

describe('scoreAttempt', () => {
  it('accepts the word when it is heard exactly', () => {
    const attempt = scoreAttempt('bottle', ['bottle']);

    expect(attempt.matched).toBe(true);
    expect(attempt.score).toBe(1);
  });

  it('takes the closest of several guesses', () => {
    const attempt = scoreAttempt('bottle', ['bottled', 'bottle', 'battle']);

    expect(attempt.score).toBe(1);
    expect(attempt.matched).toBe(true);
  });

  it('rejects a different word', () => {
    const attempt = scoreAttempt('bottle', ['keyboard']);

    expect(attempt.matched).toBe(false);
    expect(attempt.score).toBeLessThan(MATCH_THRESHOLD);
  });

  it('rejects silence', () => {
    expect(scoreAttempt('bottle', []).matched).toBe(false);
  });
});
