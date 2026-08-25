import {
  MAX_VIEWED_OBJECTS,
  recordViewedObjects,
  sanitizeViewedObjects,
} from '../src/features/learning/domain/ViewedObject';

describe('recordViewedObjects', () => {
  it('puts the newest sighting first', () => {
    const history = recordViewedObjects([], ['cup'], 1_000);

    expect(recordViewedObjects(history, ['book'], 2_000)).toEqual([
      { label: 'book', seenAtMs: 2_000 },
      { label: 'cup', seenAtMs: 1_000 },
    ]);
  });

  it('moves a repeated label up instead of duplicating it', () => {
    const history = recordViewedObjects(
      recordViewedObjects([], ['cup'], 1_000),
      ['book'],
      2_000,
    );

    expect(recordViewedObjects(history, ['cup'], 3_000)).toEqual([
      { label: 'cup', seenAtMs: 3_000 },
      { label: 'book', seenAtMs: 2_000 },
    ]);
  });

  it('normalises labels and ignores blank ones', () => {
    expect(recordViewedObjects([], [' Cell Phone ', '  '], 1_000)).toEqual([
      { label: 'cell phone', seenAtMs: 1_000 },
    ]);
  });

  it('keeps at most fifteen entries', () => {
    const history = Array.from({ length: 20 }, (_, index) =>
      String(index),
    ).reduce(
      (current, label) => recordViewedObjects(current, [label], 1_000),
      [] as ReturnType<typeof recordViewedObjects>,
    );

    expect(history).toHaveLength(MAX_VIEWED_OBJECTS);
    expect(history[0].label).toBe('19');
  });
});

describe('sanitizeViewedObjects', () => {
  it('drops anything malformed', () => {
    expect(
      sanitizeViewedObjects([
        { label: 'cup', seenAtMs: 1_000 },
        { label: '', seenAtMs: 1_000 },
        { label: 'book', seenAtMs: 'soon' },
        'nonsense',
      ]),
    ).toEqual([{ label: 'cup', seenAtMs: 1_000 }]);
  });

  it('returns nothing when the stored value is not a list', () => {
    expect(sanitizeViewedObjects(null)).toEqual([]);
    expect(sanitizeViewedObjects({})).toEqual([]);
  });
});
