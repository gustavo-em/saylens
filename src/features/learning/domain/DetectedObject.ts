export interface NormalizedBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedObject {
  id: string;
  label: string;
  confidence: number;
  bounds: NormalizedBounds;
}

export interface DetectionFrame {
  objects: DetectedObject[];
  sourceWidth: number;
  sourceHeight: number;
  inferenceTimeMs: number;
}
