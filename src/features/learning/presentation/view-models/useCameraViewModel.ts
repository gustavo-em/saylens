import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CameraAccess } from '../../application/ports/CameraAccess';
import type { PronunciationPlayer } from '../../application/ports/PronunciationPlayer';
import type { VocabularyRepository } from '../../application/ports/VocabularyRepository';
import type { DetectionFrame } from '../../domain/DetectedObject';
import {
  recordSample,
  summariseSamples,
  type DetectorSample,
} from '../../domain/DetectorMetrics';
import type { LearningLanguageSettings } from '../../domain/LearningLanguage';
import type { VocabularyEntry } from '../../domain/VocabularyEntry';
import type { LearningCopy } from '../localization/learningCopy';
import {
  DEFAULT_DETECTION_INTERPOLATION_MS,
  getDetectionInterpolationDuration,
} from '../animation/detectionInterpolation';
import type { CameraViewportCallbacks } from '../models/CameraViewportCallbacks';
import { DetectionMotionTracker } from '../tracking/DetectionMotionTracker';

interface UseCameraViewModelInput {
  cameraAccess: CameraAccess;
  isActive: boolean;
  languageSettings: LearningLanguageSettings;
  copy: LearningCopy;
  pronunciationPlayer: PronunciationPlayer;
  vocabularyRepository: VocabularyRepository;
}

export function useCameraViewModel({
  cameraAccess,
  isActive,
  languageSettings,
  copy,
  pronunciationPlayer,
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
  const [pronunciationError, setPronunciationError] = useState<string | null>(
    null,
  );
  const detectionTracker = useRef(new DetectionMotionTracker());
  const [detectorSamples, setDetectorSamples] = useState<DetectorSample[]>([]);
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
      setCameraError(copy.camera.permissionRequestFailed);
    } finally {
      setIsRequestingPermission(false);
    }
  }, [cameraAccess, copy.camera.permissionRequestFailed]);

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
      setCameraError(copy.camera.settingsOpenFailed);
    });
  }, [cameraAccess, copy.camera.settingsOpenFailed, requestPermission]);

  const handlePreviewStarted = useCallback(() => {
    setCameraError(null);
    setIsPreviewReady(true);
  }, []);

  const handlePreviewStopped = useCallback(() => {
    setIsPreviewReady(false);
    detectionTracker.current.reset();
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
    const trackedFrame = detectionTracker.current.update(frame, now);

    setDetectionInterpolationDurationMs(
      getDetectionInterpolationDuration(lastDetectionUpdate.current, now),
    );
    lastDetectionUpdate.current = now;
    setRecognitionError(null);
    setDetectionFrame(trackedFrame);
    setDetectorSamples(current =>
      recordSample(current, {
        inferenceTimeMs: frame.inferenceTimeMs,
        receivedAtMs: now,
      }),
    );
  }, []);

  const handleDetectionError = useCallback((message: string) => {
    detectionTracker.current.reset();
    lastDetectionUpdate.current = 0;
    setDetectionInterpolationDurationMs(DEFAULT_DETECTION_INTERPOLATION_MS);
    setRecognitionError(message);
    setDetectionFrame(null);
  }, []);

  const handleObjectPress = useCallback(
    (vocabulary: VocabularyEntry) => {
      setPronunciationError(null);
      pronunciationPlayer
        .speak(vocabulary.word, languageSettings.learningLanguage)
        .catch(() => {
          setPronunciationError(copy.camera.pronunciationUnavailable);
        });
    },
    [
      copy.camera.pronunciationUnavailable,
      languageSettings.learningLanguage,
      pronunciationPlayer,
    ],
  );

  useEffect(() => {
    setPronunciationError(null);

    if (!isActive) {
      pronunciationPlayer.stop().catch(() => undefined);
    }
  }, [isActive, languageSettings.learningLanguage, pronunciationPlayer]);

  const detectionItems = useMemo(
    () =>
      detectionFrame?.objects.map(object => ({
        object,
        vocabulary: vocabularyRepository.findByLabel(
          object.label,
          languageSettings,
        ),
      })) ?? [],
    [detectionFrame, languageSettings, vocabularyRepository],
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
    detectorMetrics: summariseSamples(detectorSamples, Date.now()),
    hasPermission: cameraAccess.status === 'authorized',
    isCameraLive: isActive && isPreviewReady,
    isRequestingPermission,
    languageSettings,
    onObjectPress: handleObjectPress,
    onPermissionAction: handlePermissionAction,
    permissionActionLabel: isRequestingPermission
      ? copy.camera.requestPending
      : canRequestPermission
      ? copy.camera.requestPermission
      : copy.camera.openSettings,
    recognitionError,
    pronunciationError,
    viewportCallbacks,
  };
}

export type CameraViewModel = ReturnType<typeof useCameraViewModel>;
