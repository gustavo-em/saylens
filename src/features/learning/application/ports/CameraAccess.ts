export type CameraPermissionStatus =
  | 'not-determined'
  | 'authorized'
  | 'denied'
  | 'restricted';

export interface CameraAccess {
  status: CameraPermissionStatus;
  requestPermission: () => Promise<boolean>;
  openSettings: () => Promise<void>;
}
