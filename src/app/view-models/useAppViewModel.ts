import { useCallback, useState } from 'react';

import { useVisionCameraAccess } from '../../features/learning/infrastructure/camera/useVisionCameraAccess';
import {
  DEFAULT_LEARNING_LANGUAGE_SETTINGS,
  getAvailableLearningLanguages,
  type LearningLanguage,
} from '../../features/learning/domain/LearningLanguage';
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
  const cameraAccess = useVisionCameraAccess();

  const selectTab = useCallback((tab: AppTab) => {
    setActiveTab(tab);
  }, []);

  const changeNativeLanguage = useCallback((language: LearningLanguage) => {
    setNativeLanguage(language);
    setLearningLanguage(current =>
      current === language
        ? getAvailableLearningLanguages(language)[0]
        : current,
    );
  }, []);

  const changeLearningLanguage = useCallback(
    (language: LearningLanguage) => {
      if (language !== nativeLanguage) {
        setLearningLanguage(language);
      }
    },
    [nativeLanguage],
  );

  return {
    activeTab,
    cameraAccess,
    cameraIsActive: activeTab === 'camera',
    changeLearningLanguage,
    changeNativeLanguage,
    selectTab,
    languageSettings: { nativeLanguage, learningLanguage },
    copy: getLearningCopy(nativeLanguage),
  };
}
