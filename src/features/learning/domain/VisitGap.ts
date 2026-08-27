import { startOfDay } from './LearnerProgress';

/**
 * How many days passed between the last visit and this one.
 *
 * Counted in whole days from midnight to midnight, so an app opened at
 * eleven at night and again at eight the next morning counts as coming back
 * the next day — which it did.
 */
export function getDaysSinceLastOpen(
  lastOpenedAtMs: number | null,
  nowMs: number,
): number | null {
  if (lastOpenedAtMs == null || lastOpenedAtMs <= 0) return null;

  const days = Math.round(
    (startOfDay(nowMs) - startOfDay(lastOpenedAtMs)) / (24 * 60 * 60 * 1000),
  );

  return Math.max(days, 0);
}
