export const learningLanguages = ['pt-BR', 'en-US', 'en-GB', 'es'] as const;

export type LearningLanguage = (typeof learningLanguages)[number];

/**
 * Content language behind a selectable one. The two English variants share the
 * same vocabulary and interface copy; they differ only in flag and in the voice
 * the speech engine is asked for.
 */
export type LanguageBase = 'pt-BR' | 'en' | 'es';

const languageBases: Record<LearningLanguage, LanguageBase> = {
  'pt-BR': 'pt-BR',
  'en-US': 'en',
  'en-GB': 'en',
  es: 'es',
};

export const languageFlags: Record<LearningLanguage, string> = {
  'pt-BR': '🇧🇷',
  'en-US': '🇺🇸',
  'en-GB': '🇬🇧',
  es: '🇪🇸',
};

/** One flag per content language, for places that show a translation rather
 * than a selected language. The two English variants share their vocabulary,
 * so the pair is represented by one flag. */
export const languageBaseFlags: Record<LanguageBase, string> = {
  'pt-BR': '🇧🇷',
  en: '🇺🇸',
  es: '🇪🇸',
};

export const languageCodes: Record<LearningLanguage, string> = {
  'pt-BR': 'PT',
  'en-US': 'EN',
  'en-GB': 'EN',
  es: 'ES',
};

export function languageBase(language: LearningLanguage): LanguageBase {
  return languageBases[language];
}

export interface LearningLanguageSettings {
  learningLanguage: LearningLanguage;
  nativeLanguage: LearningLanguage;
}

export const DEFAULT_LEARNING_LANGUAGE_SETTINGS: LearningLanguageSettings = {
  nativeLanguage: 'pt-BR',
  learningLanguage: 'en-US',
};
