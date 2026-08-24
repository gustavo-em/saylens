import type { AppPreferences } from '../../domain/AppPreferences';

export interface PreferencesStore {
  /** Returns the stored preferences, or null when nothing was saved yet. */
  load(): Promise<unknown>;
  save(preferences: AppPreferences): Promise<void>;
}
