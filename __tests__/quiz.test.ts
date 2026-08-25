import {
  buildRound,
  MIN_QUIZ_LABELS,
  QUIZ_CHOICE_COUNT,
  QUIZ_ROUND_LENGTH,
  recordAnswer,
} from '../src/features/learning/domain/Quiz';

const labels = ['cup', 'book', 'chair', 'bottle', 'laptop'];
const alwaysFirst = () => 0;

describe('buildRound', () => {
  it('refuses to build one without enough labels', () => {
    expect(
      buildRound(labels.slice(0, MIN_QUIZ_LABELS - 1), alwaysFirst),
    ).toEqual([]);
  });

  it('asks about every word once, without repeating one', () => {
    const round = buildRound(labels, alwaysFirst);

    expect(round).toHaveLength(labels.length);
    expect(new Set(round.map(question => question.label)).size).toBe(
      labels.length,
    );
  });

  it('caps a round even when the learner knows many words', () => {
    const many = Array.from({ length: 30 }, (_, index) => `label-${index}`);

    expect(buildRound(many, alwaysFirst)).toHaveLength(QUIZ_ROUND_LENGTH);
  });

  it('offers four distinct choices including the answer', () => {
    for (const question of buildRound(labels, alwaysFirst)) {
      expect(question.choices).toHaveLength(QUIZ_CHOICE_COUNT);
      expect(new Set(question.choices).size).toBe(QUIZ_CHOICE_COUNT);
      expect(question.choices).toContain(question.label);
    }
  });

  it('only draws from labels the learner has met', () => {
    for (const question of buildRound(labels, alwaysFirst)) {
      question.choices.forEach(choice => expect(labels).toContain(choice));
    }
  });

  it('ignores blanks, casing and repeats when counting the pool', () => {
    expect(
      buildRound(['Cup', 'cup ', ' CUP', '  ', 'book'], alwaysFirst),
    ).toEqual([]);
  });
});

describe('recordAnswer', () => {
  it('counts answers and correct ones apart', () => {
    const first = recordAnswer({ answered: 0, correct: 0 }, true);

    expect(recordAnswer(first, false)).toEqual({ answered: 2, correct: 1 });
  });
});
