import { describeDivergence } from '../src/features/learning/domain/PronunciationAttempt';

describe('pronunciation divergence', () => {
  it('finds the stretch that differs in the middle of a word', () => {
    const divergence = describeDivergence('bottle', 'bodle');

    expect(divergence).not.toBeNull();
    expect(divergence!.expected).toEqual({
      before: 'bo',
      wrong: 'tt',
      after: 'le',
    });
    expect(divergence!.heard).toEqual({
      before: 'bo',
      wrong: 'd',
      after: 'le',
    });
  });

  it('finds a difference at the end', () => {
    const divergence = describeDivergence('chair', 'chain');

    expect(divergence!.expected.before).toBe('chai');
    expect(divergence!.expected.wrong).toBe('r');
    expect(divergence!.expected.after).toBe('');
  });

  it('finds a difference at the start', () => {
    const divergence = describeDivergence('mouse', 'house');

    expect(divergence!.expected.wrong).toBe('m');
    expect(divergence!.heard.wrong).toBe('h');
    expect(divergence!.expected.after).toBe('ouse');
  });

  it('says nothing when the words match, ignoring case and accents', () => {
    expect(describeDivergence('Bottle', 'bottle')).toBeNull();
    expect(describeDivergence('Ônibus', 'onibus')).toBeNull();
  });

  it('says nothing when there is nothing to compare', () => {
    expect(describeDivergence('bottle', '')).toBeNull();
    expect(describeDivergence('', 'bottle')).toBeNull();
  });

  it('keeps the original spelling in what it returns', () => {
    const divergence = describeDivergence('Laptop', 'Lapdop');

    expect(
      divergence!.expected.before +
        divergence!.expected.wrong +
        divergence!.expected.after,
    ).toBe('Laptop');
  });
});
