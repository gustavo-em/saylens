import {
  DEFAULT_LEARNING_LANGUAGE_SETTINGS,
  learningLanguages,
  type LearningLanguage,
} from '../../features/learning/domain/LearningLanguage';
import {
  performanceProfiles,
  type PerformanceProfile,
} from '../../features/learning/domain/PerformanceProfile';
import { appearanceModes, type AppearanceMode } from '../theme/theme';

export interface AppPreferences {
  appearanceMode: AppearanceMode;
  showDiagnostics: boolean;
  learningLanguage: LearningLanguage;
  nativeLanguage: LearningLanguage;
  performanceProfile: PerformanceProfile;
}

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  appearanceMode: 'dark',
  showDiagnostics: false,
  learningLanguage: DEFAULT_LEARNING_LANGUAGE_SETTINGS.learningLanguage,
  nativeLanguage: DEFAULT_LEARNING_LANGUAGE_SETTINGS.nativeLanguage,
  performanceProfile: 'maximum-performance',
};

function pick<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/**
 * Stored preferences come from disk, so they are treated as untrusted input:
 * an unknown or corrupted value falls back to its default instead of reaching
 * the camera, the detector, or the theme.
 */
export function sanitizeAppPreferences(
  stored: unknown,
  defaults: AppPreferences = DEFAULT_APP_PREFERENCES,
  supportedProfiles: readonly PerformanceProfile[] = performanceProfiles,
): AppPreferences {
  const values = (
    typeof stored === 'object' && stored !== null ? stored : {}
  ) as Partial<Record<keyof AppPreferences, unknown>>;
  const profiles =
    supportedProfiles.length > 0 ? supportedProfiles : performanceProfiles;
  const profileFallback = profiles.includes(defaults.performanceProfile)
    ? defaults.performanceProfile
    : profiles[0];

  return {
    showDiagnostics:
      typeof values.showDiagnostics === 'boolean'
        ? values.showDiagnostics
        : defaults.showDiagnostics,
    appearanceMode: pick(
      values.appearanceMode,
      appearanceModes,
      defaults.appearanceMode,
    ),
    learningLanguage: pick(
      values.learningLanguage,
      learningLanguages,
      defaults.learningLanguage,
    ),
    nativeLanguage: pick(
      values.nativeLanguage,
      learningLanguages,
      defaults.nativeLanguage,
    ),
    performanceProfile: pick(
      values.performanceProfile,
      profiles,
      profileFallback,
    ),
  };
}
