import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CameraAccess } from '../../application/ports/CameraAccess';
import type { VocabularyRepository } from '../../application/ports/VocabularyRepository';
import type { DetectionFrame } from '../../domain/DetectedObject';
import {
  DEFAULT_DETECTION_INTERPOLATION_MS,
  getDetectionInterpolationDuration,
} from '../animation/detectionInterpolation';
import type { CameraViewportCallbacks } from '../models/CameraViewportCallbacks';

const DETECTION_PRESENTATION_FPS = 30;
const DETECTION_PRESENTATION_INTERVAL_MS = 1000 / DETECTION_PRESENTATION_FPS;

interface UseCameraViewModelInput {
  cameraAccess: CameraAccess;
  isActive: boolean;
  vocabularyRepository: VocabularyRepository;
}

export function useCameraViewModel({
  cameraAccess,
  isActive,
  vocabularyRepository,
}: UseCameraViewModelInput) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectionFrame, setDetectionFrame] = useState<DetectionFrame | null>(
    null,
  );
  const [
    detectionInterpolationDurationMs,
    setDetectionInterpolationDurationMs,
  ] = useState(DEFAULT_DETECTION_INTERPOLATION_MS);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const detectionFrameRef = useRef<DetectionFrame | null>(null);
  const lastDetectionUpdate = useRef(0);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const requestedAutomatically = useRef(false);

  const requestPermission = useCallback(async () => {
    setCameraError(null);
    setIsRequestingPermission(true);
    try {
      await cameraAccess.requestPermission();
    } catch {
      setCameraError('Não foi possível solicitar acesso à câmera.');
    } finally {
      setIsRequestingPermission(false);
    }
  }, [cameraAccess]);

  useEffect(() => {
    if (
      cameraAccess.status === 'not-determined' &&
      !requestedAutomatically.current
    ) {
      requestedAutomatically.current = true;
      requestPermission().catch(() => undefined);
    }
  }, [cameraAccess.status, requestPermission]);

  const handlePermissionAction = useCallback(() => {
    const action =
      cameraAccess.status === 'not-determined'
        ? requestPermission()
        : cameraAccess.openSettings();

    action.catch(() => {
      setCameraError('Não foi possível abrir as configurações da câmera.');
    });
  }, [cameraAccess, requestPermission]);

  const handlePreviewStarted = useCallback(() => {
    setCameraError(null);
    setIsPreviewReady(true);
  }, []);

  const handlePreviewStopped = useCallback(() => {
    setIsPreviewReady(false);
    detectionFrameRef.current = null;
    lastDetectionUpdate.current = 0;
    setDetectionInterpolationDurationMs(DEFAULT_DETECTION_INTERPOLATION_MS);
    setDetectionFrame(null);
  }, []);

  const handleCameraError = useCallback((message: string) => {
    setCameraError(message);
    setIsPreviewReady(false);
  }, []);

  const handleDetections = useCallback((frame: DetectionFrame) => {
    const now = Date.now();
    if (
      frame.objects.length === 0 &&
      detectionFrameRef.current?.objects.length === 0 &&
      now - lastDetectionUpdate.current < 1000
    ) {
      return;
    }

    if (
      now - lastDetectionUpdate.current <
      DETECTION_PRESENTATION_INTERVAL_MS
    ) {
      return;
    }

    setDetectionInterpolationDurationMs(
      getDetectionInterpolationDuration(lastDetectionUpdate.current, now),
    );
    lastDetectionUpdate.current = now;
    detectionFrameRef.current = frame;
    setRecognitionError(null);
    setDetectionFrame(frame);
  }, []);

  const handleDetectionError = useCallback((message: string) => {
    detectionFrameRef.current = null;
    lastDetectionUpdate.current = 0;
    setDetectionInterpolationDurationMs(DEFAULT_DETECTION_INTERPOLATION_MS);
    setRecognitionError(message);
    setDetectionFrame(null);
  }, []);

  const detectionItems = useMemo(
    () =>
      detectionFrame?.objects.map(object => ({
        object,
        vocabulary: vocabularyRepository.findByLabel(object.label),
      })) ?? [],
    [detectionFrame, vocabularyRepository],
  );

  const viewportCallbacks = useMemo<CameraViewportCallbacks>(
    () => ({
      onDetectionError: handleDetectionError,
      onDetections: handleDetections,
      onError: handleCameraError,
      onPreviewStarted: handlePreviewStarted,
      onPreviewStopped: handlePreviewStopped,
    }),
    [
      handleCameraError,
      handleDetectionError,
      handleDetections,
      handlePreviewStarted,
      handlePreviewStopped,
    ],
  );

  const canRequestPermission = cameraAccess.status === 'not-determined';

  return {
    cameraError,
    detectionFrame,
    detectionInterpolationDurationMs,
    detectionItems,
    hasPermission: cameraAccess.status === 'authorized',
    isCameraLive: isActive && isPreviewReady,
    isRequestingPermission,
    onPermissionAction: handlePermissionAction,
    permissionActionLabel: isRequestingPermission
      ? 'SOLICITANDO…'
      : canRequestPermission
      ? 'PERMITIR CÂMERA'
      : 'ABRIR CONFIGURAÇÕES',
    recognitionError,
    viewportCallbacks,
  };
}

export type CameraViewModel = ReturnType<typeof useCameraViewModel>;
