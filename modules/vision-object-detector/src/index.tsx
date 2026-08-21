import { NitroModules } from 'react-native-nitro-modules';

import type { SpellformeObjectDetector } from './SpellformeObjectDetector.nitro';

export type {
  NativeDetection,
  NativeDetectionBatch,
  NativeDetectionBox,
} from './SpellformeObjectDetector.nitro';

export const objectDetector =
  NitroModules.createHybridObject<SpellformeObjectDetector>(
    'SpellformeObjectDetector',
  );
