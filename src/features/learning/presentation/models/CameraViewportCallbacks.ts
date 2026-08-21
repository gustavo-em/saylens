import type { DetectionFrame } from '../../domain/DetectedObject';

export interface CameraViewportCallbacks {
  onDetectionError: (message: string) => void;
  onDetections: (frame: DetectionFrame) => void;
  onError: (message: string) => void;
  onPreviewStarted: () => void;
  onPreviewStopped: () => void;
}
