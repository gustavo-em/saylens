export const DEFAULT_DETECTION_INTERPOLATION_MS = 100;

const MINIMUM_DETECTION_INTERPOLATION_MS = 32;
const MAXIMUM_DETECTION_INTERPOLATION_MS = 150;

export function getDetectionInterpolationDuration(
  previousUpdateAtMs: number,
  currentUpdateAtMs: number,
) {
  if (
    previousUpdateAtMs <= 0 ||
    currentUpdateAtMs <= previousUpdateAtMs ||
    !Number.isFinite(previousUpdateAtMs) ||
    !Number.isFinite(currentUpdateAtMs)
  ) {
    return DEFAULT_DETECTION_INTERPOLATION_MS;
  }

  const updateIntervalMs = currentUpdateAtMs - previousUpdateAtMs;

  return Math.round(
    Math.min(
      MAXIMUM_DETECTION_INTERPOLATION_MS,
      Math.max(MINIMUM_DETECTION_INTERPOLATION_MS, updateIntervalMs),
    ),
  );
}
