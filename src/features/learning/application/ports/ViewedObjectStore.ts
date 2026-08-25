import type { ViewedObject } from '../../domain/ViewedObject';

export interface ViewedObjectStore {
  load(): Promise<unknown>;
  save(history: readonly ViewedObject[]): Promise<void>;
}
