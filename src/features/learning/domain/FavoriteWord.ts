export interface FavoriteWord {
  /** Detector label, so the entry follows whatever language is selected. */
  label: string;
  favouritedAtMs: number;
}

export function toggleFavorite(
  favorites: readonly FavoriteWord[],
  label: string,
  favouritedAtMs: number,
): FavoriteWord[] {
  const normalized = label.trim().toLowerCase();
  if (normalized.length === 0) return [...favorites];

  const existing = favorites.some(entry => entry.label === normalized);
  if (existing) {
    return favorites.filter(entry => entry.label !== normalized);
  }

  return [{ label: normalized, favouritedAtMs }, ...favorites];
}

export function isFavorite(
  favorites: readonly FavoriteWord[],
  label: string,
): boolean {
  const normalized = label.trim().toLowerCase();
  return favorites.some(entry => entry.label === normalized);
}

/** Stored favourites are untrusted input, so malformed entries are dropped. */
export function sanitizeFavorites(stored: unknown): FavoriteWord[] {
  if (!Array.isArray(stored)) return [];

  const seen = new Set<string>();

  return stored
    .filter(
      (entry): entry is FavoriteWord =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as FavoriteWord).label === 'string' &&
        (entry as FavoriteWord).label.trim().length > 0 &&
        Number.isFinite((entry as FavoriteWord).favouritedAtMs),
    )
    .map(entry => ({
      label: entry.label.trim().toLowerCase(),
      favouritedAtMs: entry.favouritedAtMs,
    }))
    .filter(entry => {
      if (seen.has(entry.label)) return false;
      seen.add(entry.label);
      return true;
    });
}
