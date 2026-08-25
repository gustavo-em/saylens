export interface VocabularyEntry {
  word: string;
  pronunciation: string;
  pronunciationHint: string;
  meaning: string;
  /** What the object is, written in the learner's own language. */
  definition: string;
  /** The same word in the two languages the learner is not studying. */
  translations: string[];
  example: string;
}
