import type { LearningLanguageSettings } from '../../domain/LearningLanguage';
import type { VocabularyEntry } from '../../domain/VocabularyEntry';

export interface VocabularyRepository {
  findByLabel(
    label: string,
    languageSettings: LearningLanguageSettings,
  ): VocabularyEntry;
}
