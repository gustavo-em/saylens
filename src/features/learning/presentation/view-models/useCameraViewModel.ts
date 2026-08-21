import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CameraAccess } from '../../application/ports/CameraAccess';
import type { VocabularyRepository } from '../../application/ports/VocabularyRepository';
import type {
  DetectedObject,
  DetectionFrame,
} from '../../domain/DetectedObject';
import type { CameraViewportCallbacks } from '../models/CameraViewportCallbacks';

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
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [selectedObject, setSelectedObject] = useState<DetectedObject | null>(
    null,
  );
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
    setDetectionFrame(null);
    setSelectedObject(null);
  }, []);

  const handleCameraError = useCallback((message: string) => {
    setCameraError(message);
    setIsPreviewReady(false);
  }, []);

  const handleDetections = useCallback((frame: DetectionFrame) => {
    if (
      frame.objects.length === 0 &&
      detectionFrameRef.current?.objects.length === 0
    ) {
      return;
    }

    const now = Date.now();
    if (now - lastDetectionUpdate.current < 200) {
      return;
    }

    lastDetectionUpdate.current = now;
    detectionFrameRef.current = frame;
    setRecognitionError(null);
    setDetectionFrame(frame);
  }, []);

  const handleDetectionError = useCallback((message: string) => {
    detectionFrameRef.current = null;
    setRecognitionError(message);
    setDetectionFrame(null);
  }, []);

  const selectObject = useCallback((object: DetectedObject) => {
    setSelectedObject(object);
  }, []);

  const dismissObject = useCallback(() => {
    setSelectedObject(null);
  }, []);

  const selectedVocabulary = useMemo(
    () =>
      selectedObject == null
        ? null
        : vocabularyRepository.findByLabel(selectedObject.label),
    [selectedObject, vocabularyRepository],
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
    detections: detectionFrame?.objects ?? [],
    dismissObject,
    hasPermission: cameraAccess.status === 'authorized',
    isCameraLive: isActive && isPreviewReady,
    isRequestingPermission,
    onObjectPress: selectObject,
    onPermissionAction: handlePermissionAction,
    permissionActionLabel: isRequestingPermission
      ? 'SOLICITANDO…'
      : canRequestPermission
      ? 'PERMITIR CÂMERA'
      : 'ABRIR CONFIGURAÇÕES',
    recognitionError,
    selectedObject,
    selectedVocabulary,
    viewportCallbacks,
  };
}

export type CameraViewModel = ReturnType<typeof useCameraViewModel>;
