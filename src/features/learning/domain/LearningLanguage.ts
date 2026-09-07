export const learningLanguages = ['pt-BR', 'en-US', 'es'] as const;

export type LearningLanguage = (typeof learningLanguages)[number];

/**
 * Content language behind a selectable one. English keeps the en-US locale
 * internally because the native speech APIs require a concrete locale, while
 * the product presents it simply as English.
 */
export type LanguageBase = 'pt-BR' | 'en' | 'es';

const languageBases: Record<LearningLanguage, LanguageBase> = {
  'pt-BR': 'pt-BR',
  'en-US': 'en',
  es: 'es',
};

export const languageFlags: Record<LearningLanguage, string> = {
  'pt-BR': '🇧🇷',
  'en-US': '🇺🇸',
  es: '🇪🇸',
};

/** One flag per content language, for places that show a translation rather
 * than a selected language. */
export const languageBaseFlags: Record<LanguageBase, string> = {
  'pt-BR': '🇧🇷',
  en: '🇺🇸',
  es: '🇪🇸',
};

export const languageCodes: Record<LearningLanguage, string> = {
  'pt-BR': 'PT',
  'en-US': 'EN',
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

/** The primary subtag of every language the app speaks, so a device locale is
 * matched on the language itself and never on its region: pt-PT, pt-BR and a
 * bare pt all land on the same Portuguese. */
const languagesByPrimarySubtag: Record<string, LearningLanguage> = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es',
};

/**
 * The first language the device asks for that the app actually speaks, or null
 * when it speaks none of them.
 *
 * The tags are taken in the order the device lists them, which is the order the
 * learner put them in, so a phone set to Japanese with Spanish underneath opens
 * in Spanish rather than in a default nobody chose.
 */
export function matchLearningLanguage(
  tags: readonly string[],
): LearningLanguage | null {
  for (const tag of tags) {
    // Android reports pt_BR, the web and iOS report pt-BR, and both are the
    // same request.
    const primary = tag.replace(/_/g, '-').split('-')[0]?.toLowerCase();
    const matched =
      primary == null ? undefined : languagesByPrimarySubtag[primary];

    if (matched != null) return matched;
  }

  return null;
}

/**
 * What to offer someone who already speaks `nativeLanguage`.
 *
 * English is what most people come for, and it is only passed over when it is
 * the language they already have.
 */
export function defaultLearningLanguageFor(
  nativeLanguage: LearningLanguage,
): LearningLanguage {
  return nativeLanguage === 'en-US' ? 'es' : 'en-US';
}
