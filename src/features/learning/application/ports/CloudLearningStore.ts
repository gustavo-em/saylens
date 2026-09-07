import type { FavoriteWord } from '../../domain/FavoriteWord';
import type { LearningLanguage } from '../../domain/LearningLanguage';
import type { LearnerProgress } from '../../domain/LearnerProgress';
import type { PronunciationProgressEntry } from '../../domain/PronunciationProgress';
import type { ViewedObject } from '../../domain/ViewedObject';
import type { AppearanceMode } from '../../../../app/theme/theme';

export interface CloudAccountProfile {
  displayName: string | null;
  email: string | null;
  providerIds: readonly string[];
  emailVerified: boolean;
  createdAtMs: number | null;
  lastSignInAtMs: number | null;
}

export interface CloudAccountPreferences {
  appearanceMode: AppearanceMode;
  learningLanguage: LearningLanguage;
  nativeLanguage: LearningLanguage;
}

/**
 * The device the account was last used on.
 *
 * One record, overwritten by whichever device opened the app most recently:
 * it answers who is still around and what they are running, without keeping a
 * log of where anybody has been. Nothing here identifies a device — there is
 * no advertising id, no serial, and no location.
 */
export interface CloudDeviceRecord {
  /** When the app was last opened on the device that wrote this. */
  lastSeenAtMs: number;
  /** The release the learner is on, which is what tells a bug still in the
   * wild from one already fixed. */
  appVersion: string;
  platform: 'ios' | 'android' | 'other';
  osVersion: string;
  /** The language the device itself is set to. It is not always the one chosen
   * in the app, and the difference is worth knowing. */
  locale: string | null;
}

export interface CloudLearningData {
  schemaVersion: 3;
  updatedAtMs: number;
  profile: CloudAccountProfile;
  preferences: CloudAccountPreferences;
  device: CloudDeviceRecord;
  favorites: readonly FavoriteWord[];
  learnerProgress: LearnerProgress;
  pronunciationProgress: readonly PronunciationProgressEntry[];
  viewedObjects: readonly ViewedObject[];
}

export interface CloudLearningStore {
  load(userId: string): Promise<unknown>;
  save(userId: string, data: CloudLearningData): Promise<void>;
  delete(userId: string): Promise<void>;
}
