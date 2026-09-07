import {
  mergeCloudLearningData,
  sanitizeCloudLearningData,
} from '../src/features/learning/domain/CloudLearningData';
import type { CloudLearningData } from '../src/features/learning/application/ports/CloudLearningStore';

const local: CloudLearningData = {
  schemaVersion: 3,
  updatedAtMs: 20,
  device: {
    lastSeenAtMs: 20,
    appVersion: '0.1.0',
    platform: 'ios',
    osVersion: '18.0',
    locale: 'pt-BR',
  },
  profile: {
    displayName: 'Gustavo',
    email: 'gustavo@example.com',
    providerIds: ['google.com'],
    emailVerified: true,
    createdAtMs: 1,
    lastSignInAtMs: 20,
  },
  preferences: {
    appearanceMode: 'dark',
    learningLanguage: 'en-US',
    nativeLanguage: 'pt-BR',
  },
  favorites: [{ label: 'chair', favouritedAtMs: 20 }],
  learnerProgress: {
    foundLabels: ['chair'],
    lastFoundDayMs: new Date(2026, 0, 2).getTime(),
    streakDays: 2,
  },
  pronunciationProgress: [
    { label: 'chair', status: 'missed', attemptedAtMs: 20 },
  ],
  viewedObjects: [{ label: 'chair', seenAtMs: 20 }],
};

describe('cloud learning data', () => {
  it('rejects unknown schemas', () => {
    expect(sanitizeCloudLearningData({ schemaVersion: 9 }, local)).toBeNull();
  });

  it('reads a record written before the device was part of it', () => {
    const restored = sanitizeCloudLearningData(
      { ...local, schemaVersion: 2, device: undefined },
      local,
    );

    // The words are the learner's either way; what is missing is filled in by
    // the device reading the record.
    expect(restored?.schemaVersion).toBe(3);
    expect(restored?.device).toEqual(local.device);
    expect(restored?.learnerProgress.foundLabels).toEqual(['chair']);
  });

  it('keeps the device that opened the app most recently', () => {
    const older = {
      ...local,
      device: {
        ...local.device,
        lastSeenAtMs: 5,
        platform: 'android' as const,
      },
    };

    expect(mergeCloudLearningData(local, older).device).toEqual(local.device);
    expect(mergeCloudLearningData(older, local).device).toEqual(local.device);
  });

  it('keeps progress from both the phone and the account', () => {
    const merged = mergeCloudLearningData(local, {
      schemaVersion: 3,
      updatedAtMs: 10,
      device: { ...local.device, lastSeenAtMs: 10 },
      profile: local.profile,
      preferences: {
        appearanceMode: 'light',
        learningLanguage: 'es',
        nativeLanguage: 'en-US',
      },
      favorites: [{ label: 'bottle', favouritedAtMs: 10 }],
      learnerProgress: {
        foundLabels: ['bottle'],
        lastFoundDayMs: new Date(2026, 0, 1).getTime(),
        streakDays: 1,
      },
      pronunciationProgress: [
        { label: 'chair', status: 'matched', attemptedAtMs: 10 },
      ],
      viewedObjects: [{ label: 'bottle', seenAtMs: 10 }],
    });

    expect(merged.learnerProgress.foundLabels).toEqual(['chair', 'bottle']);
    expect(merged.favorites.map(entry => entry.label)).toEqual([
      'chair',
      'bottle',
    ]);
    expect(merged.pronunciationProgress[0]?.status).toBe('matched');
    expect(merged.viewedObjects.map(entry => entry.label)).toEqual([
      'chair',
      'bottle',
    ]);
    expect(merged.preferences.appearanceMode).toBe('light');
    expect(merged.profile).toEqual(local.profile);
  });

  it('migrates the original learning-only document without losing data', () => {
    const migrated = sanitizeCloudLearningData(
      {
        schemaVersion: 1,
        updatedAtMs: 10,
        favorites: [{ label: 'bottle', favouritedAtMs: 10 }],
        learnerProgress: {
          foundLabels: ['bottle'],
          lastFoundDayMs: new Date(2026, 0, 1).getTime(),
          streakDays: 1,
        },
        pronunciationProgress: [],
        viewedObjects: [{ label: 'bottle', seenAtMs: 10 }],
      },
      local,
    );

    expect(migrated?.schemaVersion).toBe(3);
    expect(migrated?.profile).toEqual(local.profile);
    expect(migrated?.device).toEqual(local.device);
    expect(migrated?.preferences).toEqual(local.preferences);
    expect(migrated?.viewedObjects[0]?.label).toBe('bottle');
  });
});
