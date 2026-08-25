export interface DetectorSample {
  inferenceTimeMs: number;
  receivedAtMs: number;
}

export interface DetectorMetrics {
  framesPerSecond: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  sampleCount: number;
}

/** Samples older than this stop counting, so the panel reflects now. */
export const METRICS_WINDOW_MS = 5_000;
const MAX_SAMPLES = 120;

export function recordSample(
  samples: readonly DetectorSample[],
  sample: DetectorSample,
): DetectorSample[] {
  const cutoff = sample.receivedAtMs - METRICS_WINDOW_MS;

  return [...samples, sample]
    .filter(entry => entry.receivedAtMs > cutoff)
    .slice(-MAX_SAMPLES);
}

function percentile(sorted: readonly number[], fraction: number) {
  if (sorted.length === 0) return 0;

  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(fraction * sorted.length) - 1),
  );
  return sorted[index];
}

export function summariseSamples(
  samples: readonly DetectorSample[],
  nowMs: number,
): DetectorMetrics {
  if (samples.length === 0) {
    return {
      framesPerSecond: 0,
      latencyP50Ms: 0,
      latencyP95Ms: 0,
      sampleCount: 0,
    };
  }

  const oldest = samples[0].receivedAtMs;
  // A single sample has no span to divide by, so rate stays at zero until the
  // second one arrives rather than reporting an infinite frame rate.
  const elapsedMs = Math.max(nowMs - oldest, 1);
  const latencies = samples
    .map(sample => sample.inferenceTimeMs)
    .sort((a, b) => a - b);

  return {
    framesPerSecond:
      samples.length > 1 ? ((samples.length - 1) * 1_000) / elapsedMs : 0,
    latencyP50Ms: percentile(latencies, 0.5),
    latencyP95Ms: percentile(latencies, 0.95),
    sampleCount: samples.length,
  };
}
