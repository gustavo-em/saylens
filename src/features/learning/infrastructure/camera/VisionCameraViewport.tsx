import { useEffect, useState } from 'react';
import { AppState, StyleSheet } from 'react-native';
import {
  Camera,
  useCameraDevice,
  type CameraViewProps,
} from 'react-native-vision-camera';

interface VisionCameraViewportProps {
  isActive: boolean;
  onError: (message: string) => void;
  onPreviewStarted: () => void;
  onPreviewStopped: () => void;
}

function useAppIsActive() {
  const [isActive, setIsActive] = useState(
    () => AppState.currentState === 'active',
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      setIsActive(nextState === 'active');
    });

    return () => subscription.remove();
  }, []);

  return isActive;
}

export function VisionCameraViewport({
  isActive,
  onError,
  onPreviewStarted,
  onPreviewStopped,
}: VisionCameraViewportProps) {
  const appIsActive = useAppIsActive();
  const device = useCameraDevice('back', {
    physicalDevices: ['wide-angle'],
  });

  const handleError: NonNullable<CameraViewProps['onError']> = () => {
    onError('Não foi possível iniciar a câmera.');
  };

  if (device == null) {
    return null;
  }

  return (
    <Camera
      device={device}
      enableNativeTapToFocusGesture
      enableNativeZoomGesture
      isActive={isActive && appIsActive}
      onError={handleError}
      onPreviewStarted={onPreviewStarted}
      onPreviewStopped={onPreviewStopped}
      resizeMode="cover"
      style={StyleSheet.absoluteFill}
    />
  );
}
