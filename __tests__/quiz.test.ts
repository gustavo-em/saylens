import {
  buildQuestion,
  MIN_QUIZ_LABELS,
  QUIZ_CHOICE_COUNT,
  recordAnswer,
} from '../src/features/learning/domain/Quiz';

const labels = ['cup', 'book', 'chair', 'bottle', 'laptop'];
const alwaysFirst = () => 0;

describe('buildQuestion', () => {
  it('refuses to build one without enough labels', () => {
    expect(
      buildQuestion(labels.slice(0, MIN_QUIZ_LABELS - 1), alwaysFirst),
    ).toBe(null);
  });

  it('offers four distinct choices including the answer', () => {
    const question = buildQuestion(labels, alwaysFirst);

    expect(question).not.toBe(null);
    expect(question!.choices).toHaveLength(QUIZ_CHOICE_COUNT);
    expect(new Set(question!.choices).size).toBe(QUIZ_CHOICE_COUNT);
    expect(question!.choices).toContain(question!.label);
  });

  it('only draws from labels the learner has met', () => {
    const question = buildQuestion(labels, alwaysFirst);

    question!.choices.forEach(choice => expect(labels).toContain(choice));
  });

  it('ignores blanks, casing and repeats when counting the pool', () => {
    expect(
      buildQuestion(['Cup', 'cup ', ' CUP', '  ', 'book'], alwaysFirst),
    ).toBe(null);
  });
});

describe('recordAnswer', () => {
  it('counts answers and correct ones apart', () => {
    const first = recordAnswer({ answered: 0, correct: 0 }, true);

    expect(recordAnswer(first, false)).toEqual({ answered: 2, correct: 1 });
  });
});
