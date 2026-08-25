export interface QuizQuestion {
  /** Detector label of the object being asked about. */
  label: string;
  /** Labels offered as answers, the correct one among them. */
  choices: string[];
}

export const QUIZ_CHOICE_COUNT = 4;
export const MIN_QUIZ_LABELS = QUIZ_CHOICE_COUNT;

/**
 * Builds a question from the labels the learner has already met. Distractors
 * come from that same pool, so a quiz never asks about a word the learner has
 * not seen through the camera.
 */
export function buildQuestion(
  labels: readonly string[],
  pickIndex: (upperBound: number) => number,
): QuizQuestion | null {
  const pool = Array.from(
    new Set(labels.map(label => label.trim().toLowerCase())),
  ).filter(label => label.length > 0);

  if (pool.length < MIN_QUIZ_LABELS) return null;

  const answer = pool[pickIndex(pool.length)];
  const distractors: string[] = [];
  const remaining = pool.filter(label => label !== answer);

  while (distractors.length < QUIZ_CHOICE_COUNT - 1 && remaining.length > 0) {
    distractors.push(...remaining.splice(pickIndex(remaining.length), 1));
  }

  const choices = [answer, ...distractors];
  // Shuffle so the answer is not always first.
  for (let index = choices.length - 1; index > 0; index -= 1) {
    const swap = pickIndex(index + 1);
    [choices[index], choices[swap]] = [choices[swap], choices[index]];
  }

  return { label: answer, choices };
}

export interface QuizScore {
  answered: number;
  correct: number;
}

export function recordAnswer(score: QuizScore, wasCorrect: boolean): QuizScore {
  return {
    answered: score.answered + 1,
    correct: score.correct + (wasCorrect ? 1 : 0),
  };
}
