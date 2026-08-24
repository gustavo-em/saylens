import { useCallback, useState } from 'react';

import {
  DEFAULT_LEARNING_LANGUAGE_SETTINGS,
  type LearningLanguage,
} from '../../features/learning/domain/LearningLanguage';
import type { PerformanceProfile } from '../../features/learning/domain/PerformanceProfile';
import { useVisionCameraAccess } from '../../features/learning/infrastructure/camera/useVisionCameraAccess';
import { getPerformanceCapabilities } from '../../features/learning/infrastructure/performance/getPerformanceCapabilities';
import { getLearningCopy } from '../../features/learning/presentation/localization/learningCopy';
import type { AppTab } from '../navigation/AppTab';
import type { AppearanceMode } from '../theme/theme';

export function useAppViewModel() {
  const [performanceCapabilities] = useState(getPerformanceCapabilities);
  const [activeTab, setActiveTab] = useState<AppTab>('camera');
  const [nativeLanguage, setNativeLanguage] = useState(
    DEFAULT_LEARNING_LANGUAGE_SETTINGS.nativeLanguage,
  );
  const [learningLanguage, setLearningLanguage] = useState(
    DEFAULT_LEARNING_LANGUAGE_SETTINGS.learningLanguage,
  );
  const [performanceProfile, setPerformanceProfile] = useState(
    performanceCapabilities.recommendedProfile,
  );
  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>('dark');
  const cameraAccess = useVisionCameraAccess();

  const selectTab = useCallback((tab: AppTab) => {
    setActiveTab(tab);
  }, []);

  const changeNativeLanguage = useCallback((language: LearningLanguage) => {
    setNativeLanguage(language);
  }, []);

  const changeLearningLanguage = useCallback((language: LearningLanguage) => {
    setLearningLanguage(language);
  }, []);

  const changePerformanceProfile = useCallback(
    (profile: PerformanceProfile) => {
      setPerformanceProfile(profile);
    },
    [],
  );

  const changeAppearanceMode = useCallback((mode: AppearanceMode) => {
    setAppearanceMode(mode);
  }, []);

  return {
    activeTab,
    appearanceMode,
    cameraAccess,
    cameraIsActive: activeTab === 'camera',
    changeAppearanceMode,
    changeLearningLanguage,
    changeNativeLanguage,
    changePerformanceProfile,
    selectTab,
    languageSettings: { nativeLanguage, learningLanguage },
    performanceCapabilities,
    performanceProfile,
    copy: getLearningCopy(nativeLanguage),
  };
}
