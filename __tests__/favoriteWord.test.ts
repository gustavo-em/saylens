import {
  isFavorite,
  sanitizeFavorites,
  toggleFavorite,
} from '../src/features/learning/domain/FavoriteWord';

describe('toggleFavorite', () => {
  it('adds a label at the top', () => {
    const favorites = toggleFavorite([], 'cup', 1_000);

    expect(toggleFavorite(favorites, 'book', 2_000)).toEqual([
      { label: 'book', favouritedAtMs: 2_000 },
      { label: 'cup', favouritedAtMs: 1_000 },
    ]);
  });

  it('removes a label that is already there', () => {
    const favorites = toggleFavorite([], 'cup', 1_000);

    expect(toggleFavorite(favorites, 'cup', 2_000)).toEqual([]);
  });

  it('normalises the label and ignores blanks', () => {
    expect(toggleFavorite([], ' Cell Phone ', 1_000)).toEqual([
      { label: 'cell phone', favouritedAtMs: 1_000 },
    ]);
    expect(toggleFavorite([], '   ', 1_000)).toEqual([]);
  });
});

describe('isFavorite', () => {
  it('matches regardless of case and padding', () => {
    const favorites = toggleFavorite([], 'cup', 1_000);

    expect(isFavorite(favorites, ' CUP ')).toBe(true);
    expect(isFavorite(favorites, 'book')).toBe(false);
  });
});

describe('sanitizeFavorites', () => {
  it('drops malformed entries and duplicates', () => {
    expect(
      sanitizeFavorites([
        { label: 'cup', favouritedAtMs: 1_000 },
        { label: 'CUP', favouritedAtMs: 2_000 },
        { label: '', favouritedAtMs: 1_000 },
        { label: 'book', favouritedAtMs: 'soon' },
        7,
      ]),
    ).toEqual([{ label: 'cup', favouritedAtMs: 1_000 }]);
  });

  it('returns nothing when the stored value is not a list', () => {
    expect(sanitizeFavorites(null)).toEqual([]);
  });
});
