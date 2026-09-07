import {
  defaultLearningLanguageFor,
  matchLearningLanguage,
} from '../src/features/learning/domain/LearningLanguage';

describe('matchLearningLanguage', () => {
  it('matches on the language and ignores the region', () => {
    expect(matchLearningLanguage(['pt-PT'])).toBe('pt-BR');
    expect(matchLearningLanguage(['en-GB'])).toBe('en-US');
    expect(matchLearningLanguage(['es-MX'])).toBe('es');
    expect(matchLearningLanguage(['pt'])).toBe('pt-BR');
  });

  it('reads the underscores Android reports as the hyphens everything else does', () => {
    expect(matchLearningLanguage(['pt_BR'])).toBe('pt-BR');
  });

  it('takes the first language the device asks for that the app speaks', () => {
    expect(matchLearningLanguage(['ja-JP', 'de-DE', 'es-ES', 'en-US'])).toBe(
      'es',
    );
  });

  it('says so rather than guessing when it speaks none of them', () => {
    expect(matchLearningLanguage(['ja-JP', 'de-DE'])).toBeNull();
    expect(matchLearningLanguage([])).toBeNull();
  });

  it('survives the nonsense a locale field can hold', () => {
    expect(matchLearningLanguage([''])).toBeNull();
    expect(matchLearningLanguage(['-'])).toBeNull();
  });
});

describe('defaultLearningLanguageFor', () => {
  it('offers English to everybody who does not already have it', () => {
    expect(defaultLearningLanguageFor('pt-BR')).toBe('en-US');
    expect(defaultLearningLanguageFor('es')).toBe('en-US');
  });

  it('never offers the language the learner already speaks', () => {
    expect(defaultLearningLanguageFor('en-US')).toBe('es');
  });
});
