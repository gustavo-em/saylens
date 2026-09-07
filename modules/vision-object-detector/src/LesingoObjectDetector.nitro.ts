import type { HybridObject } from 'react-native-nitro-modules';
import type { Frame } from 'react-native-vision-camera';

export interface NativeDetectionBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface NativeDetection {
  /**
   * The detector's own name for the box, from its eighty classes.
   *
   * This is the identity of the object, not what is shown. The tracker matches
   * a box to the box it saw last frame within a label, so the label has to be
   * something the model says the same way twice: a thousand-class classifier
   * calling the same desk a laptop and then a monitor breaks the track every
   * time it changes its mind, and a broken track never gathers the readings it
   * needs to earn a card.
   */
  label: string;
  /**
   * What the classifier called the same box, when it was asked.
   *
   * Better than the detector's name and far less stable, so it rides along as
   * a display name rather than replacing the one identity is built on.
   */
  refinedLabel?: string;
  score: number;
  boundingBox: NativeDetectionBox;
}

export interface NativeDetectionBatch {
  detections: NativeDetection[];
  frameWidth: number;
  frameHeight: number;
  rotationDegrees: number;
  inferenceTimeMs: number;
}

export interface LesingoObjectDetector
  extends HybridObject<{
    android: 'kotlin';
    ios: 'swift';
  }> {
  getModelName(): string;
  getRecommendedPerformanceProfile(): string;
  getSupportedPerformanceProfiles(): string[];
  getRecommendedCpuWorkerCount(): number;
  getSupportsGpuDelegate(): boolean;
  configureWorkers(cpuWorkerCount: number, gpuWorkerCount: number): void;
  detect(frame: Frame): NativeDetectionBatch | undefined;
  close(): void;
}
