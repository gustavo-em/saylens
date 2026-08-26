import type { PronunciationProgressEntry } from './PronunciationProgress';
import { getPronunciationStatus, isResting } from './PronunciationProgress';
import type { ViewedObject } from './ViewedObject';

/**
 * A word is worth revisiting once a day has passed since it was met, or as
 * soon as it has been pronounced wrongly.
 *
 * This is the first step of spaced repetition rather than the whole of it: one
 * interval, one rule, and a number a learner can act on. What it must not do
 * is grow: a queue that asks for everything is a queue nobody opens.
 */
const A_DAY_MS = 24 * 60 * 60 * 1000;

export function getWordsToReview(
  viewedObjects: readonly ViewedObject[],
  pronunciationProgress: readonly PronunciationProgressEntry[],
  nowMs: number,
): ViewedObject[] {
  return viewedObjects.filter(entry => {
    const status = getPronunciationStatus(pronunciationProgress, entry.label);

    // A word set aside cannot be practised yet, so asking for it would be
    // asking for something the learner is not allowed to do.
    if (isResting(pronunciationProgress, entry.label, nowMs)) return false;
    if (status === 'missed') return true;
    if (status === 'matched') return false;

    return nowMs - entry.seenAtMs >= A_DAY_MS;
  });
}
