import { NitroModules } from 'react-native-nitro-modules';

import type { LesingoObjectDetector } from './LesingoObjectDetector.nitro';

export type {
  NativeDetection,
  NativeDetectionBatch,
  NativeDetectionBox,
} from './LesingoObjectDetector.nitro';

export const objectDetector =
  NitroModules.createHybridObject<LesingoObjectDetector>(
    'LesingoObjectDetector',
  );
