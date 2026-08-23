import { localVocabularyRepository } from '../src/features/learning/infrastructure/vocabulary/localVocabularyRepository';

describe('localVocabularyRepository', () => {
  it('combines the language being learned with the learner native language', () => {
    expect(
      localVocabularyRepository.findByLabel('bottle', {
        nativeLanguage: 'en',
        learningLanguage: 'es',
      }),
    ).toMatchObject({
      word: 'Botella',
      meaning: 'Bottle',
      pronunciationHint: 'bo-TÊ-ia',
    });
  });

  it('returns Portuguese learning content with Spanish explanations', () => {
    expect(
      localVocabularyRepository.findByLabel('chair', {
        nativeLanguage: 'es',
        learningLanguage: 'pt-BR',
      }),
    ).toMatchObject({ word: 'Cadeira', meaning: 'Silla' });
  });
});
