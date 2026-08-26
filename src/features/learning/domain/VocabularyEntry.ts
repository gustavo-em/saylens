import type { LanguageBase } from './LearningLanguage';

/** The same word in a language the learner is not studying, carrying the
 * language it belongs to so a card can say which is which. */
export interface VocabularyTranslation {
  language: LanguageBase;
  word: string;
}

export interface VocabularyEntry {
  word: string;
  pronunciation: string;
  pronunciationHint: string;
  meaning: string;
  /** What the object is, written in the learner's own language. */
  definition: string;
  /** The same word in the two languages the learner is not studying. */
  translations: VocabularyTranslation[];
  example: string;
}
