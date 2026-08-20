import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CameraAccess } from '../../application/ports/CameraAccess';
import type { CameraViewportCallbacks } from '../models/CameraViewportCallbacks';

interface UseCameraViewModelInput {
  cameraAccess: CameraAccess;
  isActive: boolean;
}

export function useCameraViewModel({
  cameraAccess,
  isActive,
}: UseCameraViewModelInput) {
  const [cameraError, setCameraError] = useState<string | null>(null);
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
  }, []);

  const handleCameraError = useCallback((message: string) => {
    setCameraError(message);
    setIsPreviewReady(false);
  }, []);

  const viewportCallbacks = useMemo<CameraViewportCallbacks>(
    () => ({
      onError: handleCameraError,
      onPreviewStarted: handlePreviewStarted,
      onPreviewStopped: handlePreviewStopped,
    }),
    [handleCameraError, handlePreviewStarted, handlePreviewStopped],
  );

  const canRequestPermission = cameraAccess.status === 'not-determined';

  return {
    cameraError,
    hasPermission: cameraAccess.status === 'authorized',
    isCameraLive: isActive && isPreviewReady,
    isRequestingPermission,
    onPermissionAction: handlePermissionAction,
    permissionActionLabel: isRequestingPermission
      ? 'SOLICITANDO…'
      : canRequestPermission
      ? 'PERMITIR CÂMERA'
      : 'ABRIR CONFIGURAÇÕES',
    viewportCallbacks,
  };
}

export type CameraViewModel = ReturnType<typeof useCameraViewModel>;
