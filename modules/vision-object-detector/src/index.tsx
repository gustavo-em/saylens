import { NitroModules } from 'react-native-nitro-modules';

import type { SpellformeObjectDetector } from './SpellformeObjectDetector.nitro';

export const objectDetector =
  NitroModules.createHybridObject<SpellformeObjectDetector>(
    'SpellformeObjectDetector',
  );
