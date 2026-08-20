import type { ReactNode } from 'react';

import type { CameraAccess } from '../../application/ports/CameraAccess';
import type { CameraViewportCallbacks } from '../models/CameraViewportCallbacks';
import { useCameraViewModel } from '../view-models/useCameraViewModel';
import { CameraView } from '../views/CameraView';

interface CameraScreenProps {
  cameraAccess: CameraAccess;
  isActive: boolean;
  renderCamera: (callbacks: CameraViewportCallbacks) => ReactNode;
  showGuidance: boolean;
}

export function CameraScreen({
  cameraAccess,
  isActive,
  renderCamera,
  showGuidance,
}: CameraScreenProps) {
  const viewModel = useCameraViewModel({ cameraAccess, isActive });

  return (
    <CameraView
      renderCamera={renderCamera}
      showGuidance={showGuidance}
      viewModel={viewModel}
    />
  );
}
