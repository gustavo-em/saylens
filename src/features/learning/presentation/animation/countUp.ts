/**
 * How long the count takes to reach its total.
 *
 * A fixed duration makes a small total invisible: three words counted over
 * seven hundred milliseconds is three numbers in a blink. The climb is paced
 * by how far it has to go, with a floor so even one word is seen to arrive.
 */
export function getCountUpDurationMs(target: number) {
  return Math.min(600 + target * 60, 1600);
}

/**
 * The number to show part way through a count that rolls up to its total.
 *
 * It eases out, so the last few numbers land slowly and the total is what the
 * eye rests on — a linear count reads as a loading spinner made of digits.
 */
export function getCountUpValue(
  target: number,
  elapsedMs: number,
  durationMs = getCountUpDurationMs(target),
) {
  if (target <= 0 || durationMs <= 0) return target;

  const progress = Math.min(Math.max(elapsedMs / durationMs, 0), 1);
  const eased = 1 - Math.pow(1 - progress, 3);

  return Math.min(Math.ceil(eased * target), target);
}
