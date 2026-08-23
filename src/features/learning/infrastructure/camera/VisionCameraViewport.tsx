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
  type CameraSessionConfig,
  type CameraViewProps,
  type Constraint,
} from 'react-native-vision-camera';

import {
  getPerformanceProfileSettings,
  type PerformanceCapabilities,
  type PerformanceProfile,
} from '../../domain/PerformanceProfile';
import { mapNativeDetectionBatch } from '../detection/mapNativeDetectionBatch';

const DETECTION_RESOLUTION = { width: 640, height: 360 } as const;
const MAX_REAL_TIME_CAMERA_FPS = 60;

interface VisionCameraViewportProps {
  cameraErrorMessage: string;
  detectionErrorMessage: string;
  isActive: boolean;
  onDetectionError: (message: string) => void;
  onDetections: (batch: ReturnType<typeof mapNativeDetectionBatch>) => void;
  onError: (message: string) => void;
  onPreviewStarted: () => void;
  onPreviewStopped: () => void;
  performanceCapabilities: PerformanceCapabilities;
  performanceProfile: PerformanceProfile;
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
  cameraErrorMessage,
  detectionErrorMessage,
  isActive,
  onDetectionError,
  onDetections,
  onError,
  onPreviewStarted,
  onPreviewStopped,
  performanceCapabilities,
  performanceProfile,
}: VisionCameraViewportProps) {
  const appIsActive = useAppIsActive();
  const device = useCameraDevice('back', {
    physicalDevices: ['wide-angle'],
  });

  useEffect(() => {
    const settings = getPerformanceProfileSettings(
      performanceProfile,
      performanceCapabilities,
    );
    objectDetector.configureWorkers(
      settings.cpuWorkerCount,
      settings.gpuWorkerCount,
      settings.calibrateCpuWorkers,
    );
  }, [performanceCapabilities, performanceProfile]);

  const handleDetectionBatch = useCallback(
    (batch: NativeDetectionBatch) => {
      onDetections(mapNativeDetectionBatch(batch));
    },
    [onDetections],
  );

  const handleDetectionFailure = useCallback(() => {
    onDetectionError(detectionErrorMessage);
  }, [detectionErrorMessage, onDetectionError]);

  const frameOutput = useFrameOutput({
    dropFramesWhileBusy: true,
    enablePreviewSizedOutputBuffers: true,
    pixelFormat: 'rgb',
    targetResolution: DETECTION_RESOLUTION,
    onFrame(frame) {
      'worklet';

      try {
        const batch = objectDetector.detect(frame);
        if (batch != null) {
          scheduleOnRN(handleDetectionBatch, batch);
        }
      } catch {
        scheduleOnRN(handleDetectionFailure);
      } finally {
        frame.dispose();
      }
    },
  });

  const outputs = useMemo(() => [frameOutput], [frameOutput]);
  const targetCameraFPS = useMemo(() => {
    const highestSupportedFPS = device?.supportedFPSRanges.reduce(
      (highest, range) => Math.max(highest, range.max),
      30,
    );

    return Math.min(highestSupportedFPS ?? 30, MAX_REAL_TIME_CAMERA_FPS);
  }, [device]);
  const constraints = useMemo<Constraint[]>(
    () => [{ fps: targetCameraFPS }, { binned: true }],
    [targetCameraFPS],
  );

  const handleSessionConfigSelected = useCallback(
    (config: CameraSessionConfig) => {
      console.info(
        `[SpellForMe camera] requested=${targetCameraFPS}fps selected=${
          config.selectedFPS ?? 'auto'
        }fps native=${config.nativePixelFormat} binned=${config.isBinned}`,
      );
    },
    [targetCameraFPS],
  );

  const handleError: NonNullable<CameraViewProps['onError']> = () => {
    onError(cameraErrorMessage);
  };

  if (device == null) {
    return null;
  }

  return (
    <Camera
      constraints={constraints}
      device={device}
      enableNativeTapToFocusGesture
      enableNativeZoomGesture
      isActive={isActive && appIsActive}
      onError={handleError}
      onPreviewStarted={onPreviewStarted}
      onPreviewStopped={onPreviewStopped}
      onSessionConfigSelected={handleSessionConfigSelected}
      outputs={outputs}
      resizeMode="cover"
      style={StyleSheet.absoluteFill}
    />
  );
});
