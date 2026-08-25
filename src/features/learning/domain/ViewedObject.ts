export interface ViewedObject {
  /** Detector label, so the entry re-renders in whatever language is selected. */
  label: string;
  seenAtMs: number;
}

export const MAX_VIEWED_OBJECTS = 15;

/**
 * Keeps the most recent sighting of each label, newest first, bounded to
 * MAX_VIEWED_OBJECTS. Seeing a label again moves it to the top instead of
 * adding a duplicate.
 */
export function recordViewedObjects(
  history: readonly ViewedObject[],
  labels: readonly string[],
  seenAtMs: number,
): ViewedObject[] {
  const seen = labels
    .map(label => label.trim().toLowerCase())
    .filter(label => label.length > 0);

  if (seen.length === 0) return [...history];

  const fresh = seen.map(label => ({ label, seenAtMs }));
  const kept = history.filter(entry => !seen.includes(entry.label));

  return [...fresh, ...kept].slice(0, MAX_VIEWED_OBJECTS);
}

/** Stored history is untrusted input, so anything malformed is dropped. */
export function sanitizeViewedObjects(stored: unknown): ViewedObject[] {
  if (!Array.isArray(stored)) return [];

  return stored
    .filter(
      (entry): entry is ViewedObject =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as ViewedObject).label === 'string' &&
        (entry as ViewedObject).label.trim().length > 0 &&
        Number.isFinite((entry as ViewedObject).seenAtMs),
    )
    .map(entry => ({
      label: entry.label.trim().toLowerCase(),
      seenAtMs: entry.seenAtMs,
    }))
    .slice(0, MAX_VIEWED_OBJECTS);
}
