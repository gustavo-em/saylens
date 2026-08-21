import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { scheduleOnRN } from 'react-native-worklets';
import {
  objectDetector,
  type NativeDetectionBatch,
} from 'react-native-spellforme-object-detector';
import {
  Camera,
  useCameraDevice,
  useFrameOutput,
  type CameraViewProps,
} from 'react-native-vision-camera';

import { mapNativeDetectionBatch } from '../detection/mapNativeDetectionBatch';

const DETECTION_RESOLUTION = { width: 640, height: 360 } as const;

interface VisionCameraViewportProps {
  isActive: boolean;
  onDetectionError: (message: string) => void;
  onDetections: (batch: ReturnType<typeof mapNativeDetectionBatch>) => void;
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

export const VisionCameraViewport = memo(function CameraViewport({
  isActive,
  onDetectionError,
  onDetections,
  onError,
  onPreviewStarted,
  onPreviewStopped,
}: VisionCameraViewportProps) {
  const appIsActive = useAppIsActive();
  const device = useCameraDevice('back', {
    physicalDevices: ['wide-angle'],
  });

  const handleDetectionBatch = useCallback(
    (batch: NativeDetectionBatch) => {
      onDetections(mapNativeDetectionBatch(batch));
    },
    [onDetections],
  );

  const handleDetectionFailure = useCallback(() => {
    onDetectionError('O reconhecimento de objetos ficou indisponível.');
  }, [onDetectionError]);

  const frameOutput = useFrameOutput({
    dropFramesWhileBusy: true,
    enablePreviewSizedOutputBuffers: true,
    pixelFormat: 'rgb',
    targetResolution: DETECTION_RESOLUTION,
    onFrame(frame) {
      'worklet';

      try {
        const batch = objectDetector.detect(frame);
        scheduleOnRN(handleDetectionBatch, batch);
      } catch {
        scheduleOnRN(handleDetectionFailure);
      } finally {
        frame.dispose();
      }
    },
  });

  const outputs = useMemo(() => [frameOutput], [frameOutput]);

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
      outputs={outputs}
      resizeMode="cover"
      style={StyleSheet.absoluteFill}
    />
  );
});
