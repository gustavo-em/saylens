import {
  collections,
  getCollectionProgress,
  getCollectionsProgress,
} from '../src/features/learning/domain/Collection';
import { localVocabularyRepository } from '../src/features/learning/infrastructure/vocabulary/localVocabularyRepository';

const languageSettings = {
  nativeLanguage: 'pt-BR',
  learningLanguage: 'en-US',
} as const;

describe('collections', () => {
  it('only lists labels the dictionary actually knows', () => {
    for (const collection of collections) {
      for (const label of collection.labels) {
        const vocabulary = localVocabularyRepository.findByLabel(
          label,
          languageSettings,
        );

        expect(vocabulary.translations.length).toBeGreaterThan(0);
      }
    }
  });

  it('never repeats a label inside the same collection', () => {
    for (const collection of collections) {
      expect(new Set(collection.labels).size).toBe(collection.labels.length);
    }
  });

  it('splits a collection into what was found and what is missing', () => {
    const kitchen = collections.find(entry => entry.id === 'kitchen')!;
    const progress = getCollectionProgress(kitchen, ['cup', 'bottle', 'dog']);

    expect(progress.found).toEqual(['bottle', 'cup']);
    expect(progress.missing).toHaveLength(kitchen.labels.length - 2);
    expect(progress.missing).not.toContain('cup');
  });

  it('reports every collection even when nothing was found', () => {
    const progress = getCollectionsProgress([]);

    expect(progress).toHaveLength(collections.length);
    expect(progress.every(entry => entry.found.length === 0)).toBe(true);
  });
});
