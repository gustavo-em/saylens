import type { PronunciationProgressEntry } from '../../domain/PronunciationProgress';

export interface PronunciationProgressStore {
  load(): Promise<unknown>;
  save(progress: readonly PronunciationProgressEntry[]): Promise<void>;
}
