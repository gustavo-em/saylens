import type { HybridObject } from 'react-native-nitro-modules';

export interface SpellformeObjectDetector
  extends HybridObject<{
    android: 'kotlin';
  }> {
  getModelName(): string;
}
