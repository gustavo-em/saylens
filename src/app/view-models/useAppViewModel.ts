import { useCallback, useState } from 'react';

import { useVisionCameraAccess } from '../../features/learning/infrastructure/camera/useVisionCameraAccess';
import type { AppTab } from '../navigation/AppTab';

export function useAppViewModel() {
  const [activeTab, setActiveTab] = useState<AppTab>('camera');
  const [showGuidance, setShowGuidance] = useState(true);
  const cameraAccess = useVisionCameraAccess();

  const selectTab = useCallback((tab: AppTab) => {
    setActiveTab(tab);
  }, []);

  const changeGuidanceVisibility = useCallback((value: boolean) => {
    setShowGuidance(value);
  }, []);

  return {
    activeTab,
    cameraAccess,
    cameraIsActive: activeTab === 'camera',
    changeGuidanceVisibility,
    selectTab,
    showGuidance,
  };
}
