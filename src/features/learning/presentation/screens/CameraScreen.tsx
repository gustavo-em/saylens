import { useEffect, type ReactNode } from 'react';

import type { CameraAccess } from '../../application/ports/CameraAccess';
import type { PronunciationPlayer } from '../../application/ports/PronunciationPlayer';
import type { VocabularyRepository } from '../../application/ports/VocabularyRepository';
import type { LearningLanguageSettings } from '../../domain/LearningLanguage';
import type { LearningCopy } from '../localization/learningCopy';
import type { CameraViewportCallbacks } from '../models/CameraViewportCallbacks';
import { useCameraViewModel } from '../view-models/useCameraViewModel';
import { CameraView } from '../views/CameraView';

interface CameraScreenProps {
  cameraAccess: CameraAccess;
  isActive: boolean;
  languageSettings: LearningLanguageSettings;
  copy: LearningCopy;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onPractiseSpeaking: (label: string) => void;
  showDiagnostics: boolean;
  diagnostics: {
    cpuWorkers: number;
    gpuWorkers: number;
    profileLabel: string;
  };
  onObjectsSeen: (labels: readonly string[]) => void;
  pronunciationPlayer: PronunciationPlayer;
  renderCamera: (
    callbacks: CameraViewportCallbacks,
    options: { isActive: boolean },
  ) => ReactNode;
  vocabularyRepository: VocabularyRepository;
}

export function CameraScreen({
  cameraAccess,
  isActive,
  languageSettings,
  copy,
  onOpenHistory,
  onOpenSettings,
  onPractiseSpeaking,
  showDiagnostics,
  diagnostics,
  onObjectsSeen,
  pronunciationPlayer,
  renderCamera,
  vocabularyRepository,
}: CameraScreenProps) {
  const viewModel = useCameraViewModel({
    cameraAccess,
    isActive,
    languageSettings,
    copy,
    pronunciationPlayer,
    vocabularyRepository,
  });

  const visibleLabels = viewModel.detectionItems
    .map(item => item.object.label)
    .join('|');

  useEffect(() => {
    if (visibleLabels.length === 0) return;

    onObjectsSeen(visibleLabels.split('|'));
  }, [onObjectsSeen, visibleLabels]);

  return (
    <CameraView
      renderCamera={renderCamera}
      copy={copy}
      onOpenHistory={onOpenHistory}
      onOpenSettings={onOpenSettings}
      onPractiseSpeaking={onPractiseSpeaking}
      showDiagnostics={showDiagnostics}
      diagnostics={diagnostics}
      isActive={isActive}
      viewModel={viewModel}
    />
  );
}
