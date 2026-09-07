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
  /** False until the first run has been walked through or skipped, which is
   * what tells a returning learner apart from a new one. */
  hasSeenOnboarding: boolean;
  /** The account benefit is offered once after the learner has found enough
   * words to understand its value. It remains optional. */
  hasSeenSignInPrompt: boolean;
  learningLanguage: LearningLanguage;
  nativeLanguage: LearningLanguage;
  performanceProfile: PerformanceProfile;
}

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  appearanceMode: 'dark',
  showDiagnostics: false,
  hasSeenOnboarding: false,
  hasSeenSignInPrompt: false,
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

function migrateLanguage(value: unknown): unknown {
  // en-GB was selectable before English became a single product language.
  // Keep returning learners on English instead of resetting their choice.
  return value === 'en-GB' ? 'en-US' : value;
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
    hasSeenOnboarding:
      typeof values.hasSeenOnboarding === 'boolean'
        ? values.hasSeenOnboarding
        : defaults.hasSeenOnboarding,
    hasSeenSignInPrompt:
      typeof values.hasSeenSignInPrompt === 'boolean'
        ? values.hasSeenSignInPrompt
        : defaults.hasSeenSignInPrompt,
    appearanceMode: pick(
      values.appearanceMode,
      appearanceModes,
      defaults.appearanceMode,
    ),
    learningLanguage: pick(
      migrateLanguage(values.learningLanguage),
      learningLanguages,
      defaults.learningLanguage,
    ),
    nativeLanguage: pick(
      migrateLanguage(values.nativeLanguage),
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
