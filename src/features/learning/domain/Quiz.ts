export interface QuizQuestion {
  /** Detector label of the object being asked about. */
  label: string;
  /** Labels offered as answers, the correct one among them. */
  choices: string[];
}

export const QUIZ_CHOICE_COUNT = 4;
export const MIN_QUIZ_LABELS = QUIZ_CHOICE_COUNT;
/** A round is short enough to finish in one sitting and long enough to score. */
export const QUIZ_ROUND_LENGTH = 10;

type PickIndex = (upperBound: number) => number;

function buildPool(labels: readonly string[]) {
  return Array.from(
    new Set(labels.map(label => label.trim().toLowerCase())),
  ).filter(label => label.length > 0);
}

function shuffle(values: readonly string[], pickIndex: PickIndex) {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = pickIndex(index + 1);
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }

  return shuffled;
}

function buildQuestion(
  answer: string,
  pool: readonly string[],
  pickIndex: PickIndex,
): QuizQuestion {
  const distractors: string[] = [];
  const remaining = pool.filter(label => label !== answer);

  while (distractors.length < QUIZ_CHOICE_COUNT - 1 && remaining.length > 0) {
    distractors.push(...remaining.splice(pickIndex(remaining.length), 1));
  }

  return {
    label: answer,
    choices: shuffle([answer, ...distractors], pickIndex),
  };
}

/**
 * Builds a whole round from the labels the learner has already met, one
 * question per word and never the same word twice. A round has a known length,
 * so progress and score are two different numbers rather than one confusing
 * one. Distractors come from that same pool, so a quiz never asks about a word
 * the learner has not seen through the camera.
 */
export function buildRound(
  labels: readonly string[],
  pickIndex: PickIndex,
): QuizQuestion[] {
  const pool = buildPool(labels);

  if (pool.length < MIN_QUIZ_LABELS) return [];

  return shuffle(pool, pickIndex)
    .slice(0, QUIZ_ROUND_LENGTH)
    .map(answer => buildQuestion(answer, pool, pickIndex));
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
