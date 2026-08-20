export interface CameraViewportCallbacks {
  onError: (message: string) => void;
  onPreviewStarted: () => void;
  onPreviewStopped: () => void;
}
