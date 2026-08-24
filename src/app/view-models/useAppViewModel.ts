import { useCallback, useEffect, useRef, useState } from 'react';

import type { LearningLanguage } from '../../features/learning/domain/LearningLanguage';
import type { PerformanceProfile } from '../../features/learning/domain/PerformanceProfile';
import { useVisionCameraAccess } from '../../features/learning/infrastructure/camera/useVisionCameraAccess';
import { getPerformanceCapabilities } from '../../features/learning/infrastructure/performance/getPerformanceCapabilities';
import { getLearningCopy } from '../../features/learning/presentation/localization/learningCopy';
import type { PreferencesStore } from '../application/ports/PreferencesStore';
import {
  DEFAULT_APP_PREFERENCES,
  sanitizeAppPreferences,
  type AppPreferences,
} from '../domain/AppPreferences';
import type { AppTab } from '../navigation/AppTab';
import type { AppearanceMode } from '../theme/theme';

export function useAppViewModel(preferencesStore: PreferencesStore) {
  const [performanceCapabilities] = useState(getPerformanceCapabilities);
  const [activeTab, setActiveTab] = useState<AppTab>('camera');
  const [preferences, setPreferences] = useState<AppPreferences>(() => ({
    ...DEFAULT_APP_PREFERENCES,
    performanceProfile: performanceCapabilities.recommendedProfile,
  }));
  // Preferences are only rendered once they have been read from storage, so the
  // theme never flashes and the detector is never configured with a profile the
  // user did not choose.
  const [isRestored, setIsRestored] = useState(false);
  const cameraAccess = useVisionCameraAccess();

  useEffect(() => {
    let isCurrent = true;

    preferencesStore
      .load()
      .then(stored => {
        if (!isCurrent) return;

        setPreferences(current =>
          sanitizeAppPreferences(
            stored,
            current,
            performanceCapabilities.supportedProfiles,
          ),
        );
      })
      .catch(() => undefined)
      .finally(() => {
        if (isCurrent) setIsRestored(true);
      });

    return () => {
      isCurrent = false;
    };
  }, [performanceCapabilities.supportedProfiles, preferencesStore]);

  const hasSettledAfterRestore = useRef(false);

  useEffect(() => {
    if (!isRestored) return;

    // Skip the pass that follows the restore itself, so reading from storage
    // never writes straight back and defaults never overwrite a saved choice.
    if (!hasSettledAfterRestore.current) {
      hasSettledAfterRestore.current = true;
      return;
    }

    preferencesStore.save(preferences).catch(() => undefined);
  }, [isRestored, preferences, preferencesStore]);

  const updatePreference = useCallback(
    <Key extends keyof AppPreferences>(
      key: Key,
      value: AppPreferences[Key],
    ) => {
      setPreferences(current =>
        current[key] === value ? current : { ...current, [key]: value },
      );
    },
    [],
  );

  const selectTab = useCallback((tab: AppTab) => {
    setActiveTab(tab);
  }, []);

  const changeNativeLanguage = useCallback(
    (language: LearningLanguage) =>
      updatePreference('nativeLanguage', language),
    [updatePreference],
  );

  const changeLearningLanguage = useCallback(
    (language: LearningLanguage) =>
      updatePreference('learningLanguage', language),
    [updatePreference],
  );

  const changePerformanceProfile = useCallback(
    (profile: PerformanceProfile) =>
      updatePreference('performanceProfile', profile),
    [updatePreference],
  );

  const changeAppearanceMode = useCallback(
    (mode: AppearanceMode) => updatePreference('appearanceMode', mode),
    [updatePreference],
  );

  return {
    activeTab,
    appearanceMode: preferences.appearanceMode,
    cameraAccess,
    cameraIsActive: activeTab === 'camera',
    changeAppearanceMode,
    changeLearningLanguage,
    changeNativeLanguage,
    changePerformanceProfile,
    isRestored,
    selectTab,
    languageSettings: {
      nativeLanguage: preferences.nativeLanguage,
      learningLanguage: preferences.learningLanguage,
    },
    performanceCapabilities,
    performanceProfile: preferences.performanceProfile,
    copy: getLearningCopy(preferences.nativeLanguage),
  };
}
