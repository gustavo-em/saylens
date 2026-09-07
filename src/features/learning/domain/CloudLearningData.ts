import { appearanceModes } from '../../../app/theme/theme';
import type {
  CloudAccountPreferences,
  CloudAccountProfile,
  CloudDeviceRecord,
  CloudLearningData,
} from '../application/ports/CloudLearningStore';
import { sanitizeFavorites } from './FavoriteWord';
import { learningLanguages } from './LearningLanguage';
import { sanitizeLearnerProgress } from './LearnerProgress';
import { sanitizePronunciationProgress } from './PronunciationProgress';
import { MAX_VIEWED_OBJECTS, sanitizeViewedObjects } from './ViewedObject';

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function nullableString(value: unknown, fallback: string | null) {
  return value === null || typeof value === 'string' ? value : fallback;
}

function nullableTime(value: unknown, fallback: number | null) {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
    ? value
    : fallback;
}

function sanitizeProfile(
  stored: unknown,
  fallback: CloudAccountProfile,
): CloudAccountProfile {
  const candidate = record(stored);
  if (candidate == null) return fallback;

  return {
    displayName: nullableString(candidate.displayName, fallback.displayName),
    email: nullableString(candidate.email, fallback.email),
    providerIds: Array.isArray(candidate.providerIds)
      ? [
          ...new Set(
            candidate.providerIds.filter(
              (providerId): providerId is string =>
                typeof providerId === 'string' && providerId.length > 0,
            ),
          ),
        ]
      : fallback.providerIds,
    emailVerified:
      typeof candidate.emailVerified === 'boolean'
        ? candidate.emailVerified
        : fallback.emailVerified,
    createdAtMs: nullableTime(candidate.createdAtMs, fallback.createdAtMs),
    lastSignInAtMs: nullableTime(
      candidate.lastSignInAtMs,
      fallback.lastSignInAtMs,
    ),
  };
}

function sanitizePreferences(
  stored: unknown,
  fallback: CloudAccountPreferences,
): CloudAccountPreferences {
  const candidate = record(stored);
  if (candidate == null) return fallback;

  return {
    appearanceMode: appearanceModes.includes(
      candidate.appearanceMode as CloudAccountPreferences['appearanceMode'],
    )
      ? (candidate.appearanceMode as CloudAccountPreferences['appearanceMode'])
      : fallback.appearanceMode,
    learningLanguage: learningLanguages.includes(
      candidate.learningLanguage as CloudAccountPreferences['learningLanguage'],
    )
      ? (candidate.learningLanguage as CloudAccountPreferences['learningLanguage'])
      : fallback.learningLanguage,
    nativeLanguage: learningLanguages.includes(
      candidate.nativeLanguage as CloudAccountPreferences['nativeLanguage'],
    )
      ? (candidate.nativeLanguage as CloudAccountPreferences['nativeLanguage'])
      : fallback.nativeLanguage,
  };
}

const devicePlatforms: readonly CloudDeviceRecord['platform'][] = [
  'ios',
  'android',
  'other',
];

/** Anything unrecognised falls back to what this device knows about itself,
 * because a record of where the app ran is worthless if it can be any shape. */
function sanitizeDevice(
  stored: unknown,
  fallback: CloudDeviceRecord,
): CloudDeviceRecord {
  const candidate = record(stored);
  if (candidate == null) return fallback;

  const text = (value: unknown, limit: number, backup: string) =>
    typeof value === 'string' && value.length > 0 && value.length <= limit
      ? value
      : backup;

  return {
    lastSeenAtMs:
      typeof candidate.lastSeenAtMs === 'number' &&
      Number.isFinite(candidate.lastSeenAtMs) &&
      candidate.lastSeenAtMs >= 0
        ? candidate.lastSeenAtMs
        : fallback.lastSeenAtMs,
    appVersion: text(candidate.appVersion, 40, fallback.appVersion),
    platform: devicePlatforms.includes(
      candidate.platform as CloudDeviceRecord['platform'],
    )
      ? (candidate.platform as CloudDeviceRecord['platform'])
      : fallback.platform,
    osVersion: text(candidate.osVersion, 40, fallback.osVersion),
    locale:
      candidate.locale === null
        ? null
        : text(candidate.locale, 40, fallback.locale ?? ''),
  };
}

export function sanitizeCloudLearningData(
  stored: unknown,
  fallback: CloudLearningData,
): CloudLearningData | null {
  const candidate = record(stored);
  if (candidate == null) return null;

  // Version 1 predates the account fields and version 2 predates the device
  // record. Both are read rather than discarded: the words in them are the
  // learner's, and what is missing is filled from this device.
  const version = candidate.schemaVersion;
  if (version !== 1 && version !== 2 && version !== 3) return null;

  return {
    schemaVersion: 3,
    updatedAtMs: Number.isFinite(candidate.updatedAtMs)
      ? (candidate.updatedAtMs as number)
      : 0,
    profile:
      version === 1
        ? fallback.profile
        : sanitizeProfile(candidate.profile, fallback.profile),
    preferences:
      version === 1
        ? fallback.preferences
        : sanitizePreferences(candidate.preferences, fallback.preferences),
    device:
      version === 3
        ? sanitizeDevice(candidate.device, fallback.device)
        : fallback.device,
    favorites: sanitizeFavorites(candidate.favorites),
    learnerProgress: sanitizeLearnerProgress(candidate.learnerProgress),
    pronunciationProgress: sanitizePronunciationProgress(
      candidate.pronunciationProgress,
    ),
    viewedObjects: sanitizeViewedObjects(candidate.viewedObjects),
  };
}

/**
 * The first sign-in combines work done before the account existed with work
 * already stored by that account. Later writes use this merged snapshot, so a
 * new phone never starts by erasing the learner's existing words.
 */
export function mergeCloudLearningData(
  local: CloudLearningData,
  cloud: CloudLearningData,
): CloudLearningData {
  const viewedObjects = sanitizeViewedObjects(
    [...local.viewedObjects, ...cloud.viewedObjects]
      .sort((left, right) => right.seenAtMs - left.seenAtMs)
      .filter(
        (entry, index, entries) =>
          entries.findIndex(candidate => candidate.label === entry.label) ===
          index,
      )
      .slice(0, MAX_VIEWED_OBJECTS),
  );

  const favorites = sanitizeFavorites(
    [...local.favorites, ...cloud.favorites]
      .sort((left, right) => right.favouritedAtMs - left.favouritedAtMs)
      .filter(
        (entry, index, entries) =>
          entries.findIndex(candidate => candidate.label === entry.label) ===
          index,
      ),
  );

  const pronunciationProgress = sanitizePronunciationProgress(
    [...local.pronunciationProgress, ...cloud.pronunciationProgress]
      .sort((left, right) => {
        if (left.status !== right.status) {
          return left.status === 'matched' ? -1 : 1;
        }
        return right.attemptedAtMs - left.attemptedAtMs;
      })
      .filter(
        (entry, index, entries) =>
          entries.findIndex(candidate => candidate.label === entry.label) ===
          index,
      ),
  );

  const latestProgress =
    local.learnerProgress.lastFoundDayMs >= cloud.learnerProgress.lastFoundDayMs
      ? local.learnerProgress
      : cloud.learnerProgress;

  return {
    schemaVersion: 3,
    updatedAtMs: Math.max(local.updatedAtMs, cloud.updatedAtMs),
    profile: local.profile,
    preferences: cloud.preferences,
    // One record of the last device seen, not a log of every device: whichever
    // opened the app most recently is the one worth keeping.
    device:
      local.device.lastSeenAtMs >= cloud.device.lastSeenAtMs
        ? local.device
        : cloud.device,
    favorites,
    learnerProgress: sanitizeLearnerProgress({
      ...latestProgress,
      foundLabels: [
        ...local.learnerProgress.foundLabels,
        ...cloud.learnerProgress.foundLabels,
      ],
    }),
    pronunciationProgress,
    viewedObjects,
  };
}
