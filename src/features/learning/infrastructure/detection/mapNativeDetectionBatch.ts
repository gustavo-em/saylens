import type {
  NativeDetectionBatch,
  NativeDetectionBox,
} from 'react-native-saylens-object-detector';

import type {
  DetectedObject,
  DetectionFrame,
  NormalizedBounds,
} from '../../domain/DetectedObject';

interface RotatedBox extends NativeDetectionBox {
  sourceWidth: number;
  sourceHeight: number;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function normalizeRotation(rotationDegrees: number) {
  const normalized = Math.round(rotationDegrees) % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function rotateBox(
  box: NativeDetectionBox,
  frameWidth: number,
  frameHeight: number,
  rotationDegrees: number,
): RotatedBox {
  switch (normalizeRotation(rotationDegrees)) {
    case 90:
      return {
        left: frameHeight - box.bottom,
        top: box.left,
        right: frameHeight - box.top,
        bottom: box.right,
        sourceWidth: frameHeight,
        sourceHeight: frameWidth,
      };
    case 180:
      return {
        left: frameWidth - box.right,
        top: frameHeight - box.bottom,
        right: frameWidth - box.left,
        bottom: frameHeight - box.top,
        sourceWidth: frameWidth,
        sourceHeight: frameHeight,
      };
    case 270:
      return {
        left: box.top,
        top: frameWidth - box.right,
        right: box.bottom,
        bottom: frameWidth - box.left,
        sourceWidth: frameHeight,
        sourceHeight: frameWidth,
      };
    default:
      return {
        ...box,
        sourceWidth: frameWidth,
        sourceHeight: frameHeight,
      };
  }
}

/**
 * A box is allowed to run past the frame edge. Clamping it to the viewport made
 * a half-visible object's frame stick to the screen border instead of following
 * the object out of view.
 */
const BOUNDS_OVERFLOW = 0.5;

function normalizeBox(box: RotatedBox): NormalizedBounds {
  const minimum = -BOUNDS_OVERFLOW;
  const maximum = 1 + BOUNDS_OVERFLOW;
  const left = clamp(box.left / box.sourceWidth, minimum, maximum);
  const top = clamp(box.top / box.sourceHeight, minimum, maximum);
  const right = clamp(box.right / box.sourceWidth, minimum, maximum);
  const bottom = clamp(box.bottom / box.sourceHeight, minimum, maximum);

  return {
    x: left,
    y: top,
    width: Math.max(right - left, 0),
    height: Math.max(bottom - top, 0),
  };
}

export function mapNativeDetectionBatch(
  batch: NativeDetectionBatch,
): DetectionFrame {
  const rotation = normalizeRotation(batch.rotationDegrees);
  const swapsDimensions = rotation === 90 || rotation === 270;
  const sourceWidth = swapsDimensions ? batch.frameHeight : batch.frameWidth;
  const sourceHeight = swapsDimensions ? batch.frameWidth : batch.frameHeight;

  const objects = batch.detections
    .map<DetectedObject>((detection, index) => {
      const label = detection.label.trim().replaceAll('_', ' ') || 'object';
      const rotatedBox = rotateBox(
        detection.boundingBox,
        batch.frameWidth,
        batch.frameHeight,
        rotation,
      );

      return {
        id: `${label}-${index}`,
        label,
        confidence: clamp(detection.score, 0, 1),
        bounds: normalizeBox(rotatedBox),
      };
    })
    .filter(object => object.bounds.width > 0 && object.bounds.height > 0);

  return {
    objects,
    sourceWidth,
    sourceHeight,
    inferenceTimeMs: Math.max(batch.inferenceTimeMs, 0),
  };
}
