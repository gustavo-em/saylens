import { mapNativeDetectionBatch } from '../src/features/learning/infrastructure/detection/mapNativeDetectionBatch';

describe('mapNativeDetectionBatch', () => {
  it('normalizes boxes from an upright frame', () => {
    const frame = mapNativeDetectionBatch({
      detections: [
        {
          label: 'cell_phone',
          score: 0.82,
          boundingBox: { left: 64, top: 36, right: 320, bottom: 180 },
        },
      ],
      frameWidth: 640,
      frameHeight: 360,
      rotationDegrees: 0,
      inferenceTimeMs: 42,
    });

    expect(frame.sourceWidth).toBe(640);
    expect(frame.sourceHeight).toBe(360);
    expect(frame.objects[0]).toMatchObject({
      label: 'cell phone',
      confidence: 0.82,
      bounds: { x: 0.1, y: 0.1, width: 0.4, height: 0.4 },
    });
  });

  it('rotates camera coordinates into portrait space', () => {
    const frame = mapNativeDetectionBatch({
      detections: [
        {
          label: 'book',
          score: 0.9,
          boundingBox: { left: 64, top: 36, right: 320, bottom: 180 },
        },
      ],
      frameWidth: 640,
      frameHeight: 360,
      rotationDegrees: 90,
      inferenceTimeMs: 30,
    });

    expect(frame.sourceWidth).toBe(360);
    expect(frame.sourceHeight).toBe(640);
    expect(frame.objects[0].bounds).toEqual({
      x: 0.5,
      y: 0.1,
      width: 0.4,
      height: 0.4,
    });
  });

  it('lets a box run past the frame edge but bounds the overflow', () => {
    const frame = mapNativeDetectionBatch({
      detections: [
        {
          label: ' bottle ',
          score: 1.2,
          boundingBox: { left: -10, top: -20, right: 110, bottom: 220 },
        },
      ],
      frameWidth: 100,
      frameHeight: 200,
      rotationDegrees: 0,
      inferenceTimeMs: -1,
    });

    // A half-visible object keeps a box that follows it off screen, so the
    // coordinates are allowed past the edge by half a frame.
    const { bounds, ...rest } = frame.objects[0];

    expect(rest).toMatchObject({ label: 'bottle', confidence: 1 });
    expect(bounds.x).toBeCloseTo(-0.1);
    expect(bounds.y).toBeCloseTo(-0.1);
    expect(bounds.width).toBeCloseTo(1.2);
    expect(bounds.height).toBeCloseTo(1.2);
    expect(frame.inferenceTimeMs).toBe(0);
  });
});
