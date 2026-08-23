import { useCallback, useState } from 'react';

import { useVisionCameraAccess } from '../../features/learning/infrastructure/camera/useVisionCameraAccess';
import {
  DEFAULT_LEARNING_LANGUAGE_SETTINGS,
  type LearningLanguage,
} from '../../features/learning/domain/LearningLanguage';
import {
  DEFAULT_PERFORMANCE_PROFILE,
  type PerformanceProfile,
} from '../../features/learning/domain/PerformanceProfile';
import { getLearningCopy } from '../../features/learning/presentation/localization/learningCopy';
import type { AppTab } from '../navigation/AppTab';

export function useAppViewModel() {
  const [activeTab, setActiveTab] = useState<AppTab>('camera');
  const [nativeLanguage, setNativeLanguage] = useState(
    DEFAULT_LEARNING_LANGUAGE_SETTINGS.nativeLanguage,
  );
  const [learningLanguage, setLearningLanguage] = useState(
    DEFAULT_LEARNING_LANGUAGE_SETTINGS.learningLanguage,
  );
  const [performanceProfile, setPerformanceProfile] = useState(
    DEFAULT_PERFORMANCE_PROFILE,
  );
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

  return {
    activeTab,
    cameraAccess,
    cameraIsActive: activeTab === 'camera',
    changeLearningLanguage,
    changeNativeLanguage,
    changePerformanceProfile,
    selectTab,
    languageSettings: { nativeLanguage, learningLanguage },
    performanceProfile,
    copy: getLearningCopy(nativeLanguage),
  };
}
