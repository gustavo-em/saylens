/**
 * Gives up waiting on a promise, without cancelling it.
 *
 * Firestore's write promises settle when the server acknowledges them, so with
 * no signal they simply never settle. Anything a learner is standing in front
 * of — signing out, deleting an account — cannot be left waiting on that. The
 * write itself is not abandoned: Firestore keeps it queued and sends it when
 * there is a connection again. Only the waiting stops.
 */
export function withTimeout<T>(
  work: Promise<T>,
  milliseconds: number,
): Promise<T | null> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), milliseconds);

    work
      .then(value => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}
