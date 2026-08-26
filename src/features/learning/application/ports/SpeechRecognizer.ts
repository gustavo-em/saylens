import type { LearningLanguage } from '../../domain/LearningLanguage';

export interface SpeechRecognizer {
  isAvailable(): Promise<boolean>;
  hasPermission(): Promise<boolean>;
  /** Records one utterance and returns the transcripts, best guess first. */
  listen(language: LearningLanguage): Promise<string[]>;
  /** Ends the recording and keeps what was said, for a learner who has
   * finished the word and does not want to wait out the silence. */
  stop(): Promise<void>;
  /** How loud the microphone is hearing the room right now, from 0 to 1. */
  level(): Promise<number>;
  cancel(): Promise<void>;
}
