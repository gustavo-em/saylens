import {
  DEFAULT_DETECTION_INTERPOLATION_MS,
  getDetectionInterpolationDuration,
} from '../src/features/learning/presentation/animation/detectionInterpolation';

describe('getDetectionInterpolationDuration', () => {
  it('uses a stable default for the first detection', () => {
    expect(getDetectionInterpolationDuration(0, 1_000)).toBe(
      DEFAULT_DETECTION_INTERPOLATION_MS,
    );
  });

  it('follows the measured interval between detection updates', () => {
    expect(getDetectionInterpolationDuration(1_000, 1_125)).toBe(125);
  });

  it('bounds the animation duration for very fast and stalled updates', () => {
    expect(getDetectionInterpolationDuration(1_000, 1_005)).toBe(32);
    expect(getDetectionInterpolationDuration(1_000, 2_000)).toBe(150);
  });

  it('falls back when timestamps are not chronological', () => {
    expect(getDetectionInterpolationDuration(1_000, 900)).toBe(
      DEFAULT_DETECTION_INTERPOLATION_MS,
    );
  });
});
