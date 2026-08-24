import type { ReactNode } from 'react';

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
  pronunciationPlayer: PronunciationPlayer;
  renderCamera: (callbacks: CameraViewportCallbacks) => ReactNode;
  vocabularyRepository: VocabularyRepository;
}

export function CameraScreen({
  cameraAccess,
  isActive,
  languageSettings,
  copy,
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

  return (
    <CameraView
      renderCamera={renderCamera}
      copy={copy}
      isActive={isActive}
      viewModel={viewModel}
    />
  );
}
