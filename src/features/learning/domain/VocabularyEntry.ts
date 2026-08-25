export interface VocabularyEntry {
  word: string;
  pronunciation: string;
  pronunciationHint: string;
  meaning: string;
  /** The same word in the two languages the learner is not studying. */
  translations: string[];
  example: string;
}
