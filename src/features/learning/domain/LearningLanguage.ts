export const learningLanguages = ['pt-BR', 'en', 'es'] as const;

export type LearningLanguage = (typeof learningLanguages)[number];

export interface LearningLanguageSettings {
  learningLanguage: LearningLanguage;
  nativeLanguage: LearningLanguage;
}

export const DEFAULT_LEARNING_LANGUAGE_SETTINGS: LearningLanguageSettings = {
  nativeLanguage: 'pt-BR',
  learningLanguage: 'en',
};
