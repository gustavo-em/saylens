import { useCallback, useMemo } from 'react';
import { Linking } from 'react-native';
import { useCameraPermission } from 'react-native-vision-camera';

import type { CameraAccess } from '../../application/ports/CameraAccess';

export function useVisionCameraAccess(): CameraAccess {
  const { status, requestPermission } = useCameraPermission();

  const openSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  return useMemo(
    () => ({
      status,
      requestPermission,
      openSettings,
    }),
    [openSettings, requestPermission, status],
  );
}
