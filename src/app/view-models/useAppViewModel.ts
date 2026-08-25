import { useCallback, useEffect, useRef, useState } from 'react';

import type { LearningLanguage } from '../../features/learning/domain/LearningLanguage';
import type { PerformanceProfile } from '../../features/learning/domain/PerformanceProfile';
import { useVisionCameraAccess } from '../../features/learning/infrastructure/camera/useVisionCameraAccess';
import { getPerformanceCapabilities } from '../../features/learning/infrastructure/performance/getPerformanceCapabilities';
import { getLearningCopy } from '../../features/learning/presentation/localization/learningCopy';
import type { ViewedObjectStore } from '../../features/learning/application/ports/ViewedObjectStore';
import {
  recordViewedObjects,
  sanitizeViewedObjects,
  type ViewedObject,
} from '../../features/learning/domain/ViewedObject';
import type { PreferencesStore } from '../application/ports/PreferencesStore';
import {
  DEFAULT_APP_PREFERENCES,
  sanitizeAppPreferences,
  type AppPreferences,
} from '../domain/AppPreferences';
import type { AppTab } from '../navigation/AppTab';
import type { AppearanceMode } from '../theme/theme';

export function useAppViewModel(
  preferencesStore: PreferencesStore,
  viewedObjectStore: ViewedObjectStore,
) {
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
  const [viewedObjects, setViewedObjects] = useState<ViewedObject[]>([]);
  const cameraAccess = useVisionCameraAccess();

  useEffect(() => {
    let isCurrent = true;

    viewedObjectStore
      .load()
      .then(stored => {
        if (isCurrent) setViewedObjects(sanitizeViewedObjects(stored));
      })
      .catch(() => undefined);

    return () => {
      isCurrent = false;
    };
  }, [viewedObjectStore]);

  const recordViewedLabels = useCallback(
    (labels: readonly string[]) => {
      setViewedObjects(current => {
        const next = recordViewedObjects(current, labels, Date.now());
        if (
          next.length === current.length &&
          next[0]?.label === current[0]?.label
        ) {
          return current;
        }

        viewedObjectStore.save(next).catch(() => undefined);
        return next;
      });
    },
    [viewedObjectStore],
  );

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

  const toggleDiagnostics = useCallback(
    (enabled: boolean) => updatePreference('showDiagnostics', enabled),
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
    recordViewedLabels,
    selectTab,
    showDiagnostics: preferences.showDiagnostics,
    toggleDiagnostics,
    viewedObjects,
    languageSettings: {
      nativeLanguage: preferences.nativeLanguage,
      learningLanguage: preferences.learningLanguage,
    },
    performanceCapabilities,
    performanceProfile: preferences.performanceProfile,
    copy: getLearningCopy(preferences.nativeLanguage),
  };
}
