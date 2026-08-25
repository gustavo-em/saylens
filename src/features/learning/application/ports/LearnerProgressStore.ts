import type { LearnerProgress } from '../../domain/LearnerProgress';

export interface LearnerProgressStore {
  load(): Promise<unknown>;
  save(progress: LearnerProgress): Promise<void>;
}
