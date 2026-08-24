import { NitroModules } from 'react-native-nitro-modules';

import type { SayLensObjectDetector } from './SayLensObjectDetector.nitro';

export type {
  NativeDetection,
  NativeDetectionBatch,
  NativeDetectionBox,
} from './SayLensObjectDetector.nitro';

export const objectDetector =
  NitroModules.createHybridObject<SayLensObjectDetector>(
    'SayLensObjectDetector',
  );
