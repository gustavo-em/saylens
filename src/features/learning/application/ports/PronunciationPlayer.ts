import type { LearningLanguage } from '../../domain/LearningLanguage';

export interface PronunciationPlayer {
  speak(word: string, language: LearningLanguage): Promise<void>;
  stop(): Promise<void>;
}
