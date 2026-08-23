import type { HybridObject } from 'react-native-nitro-modules';
import type { Frame } from 'react-native-vision-camera';

export interface NativeDetectionBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface NativeDetection {
  label: string;
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

export interface SpellformeObjectDetector
  extends HybridObject<{
    android: 'kotlin';
  }> {
  getModelName(): string;
  getRecommendedPerformanceProfile(): string;
  getSupportedPerformanceProfiles(): string[];
  getRecommendedCpuWorkerCount(): number;
  configureWorkers(cpuWorkerCount: number, gpuWorkerCount: number): void;
  detect(frame: Frame): NativeDetectionBatch;
  close(): void;
}
