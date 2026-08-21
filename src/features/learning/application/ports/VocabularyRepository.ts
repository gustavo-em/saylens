import type { VocabularyEntry } from '../../domain/VocabularyEntry';

export interface VocabularyRepository {
  findByLabel(label: string): VocabularyEntry;
}
