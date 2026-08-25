import type { LearningLanguage } from '../../domain/LearningLanguage';

export interface SpeechRecognizer {
  isAvailable(): Promise<boolean>;
  hasPermission(): Promise<boolean>;
  /** Records one utterance and returns the transcripts, best guess first. */
  listen(language: LearningLanguage): Promise<string[]>;
  cancel(): Promise<void>;
}
