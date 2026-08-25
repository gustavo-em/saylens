import {
  METRICS_WINDOW_MS,
  recordSample,
  summariseSamples,
  type DetectorSample,
} from '../src/features/learning/domain/DetectorMetrics';

function sample(receivedAtMs: number, inferenceTimeMs: number): DetectorSample {
  return { inferenceTimeMs, receivedAtMs };
}

describe('recordSample', () => {
  it('drops samples older than the window', () => {
    const samples = [sample(1_000, 500), sample(2_000, 500)].reduce(
      recordSample,
      [] as DetectorSample[],
    );

    expect(
      recordSample(samples, sample(2_000 + METRICS_WINDOW_MS + 1, 500)).map(
        entry => entry.receivedAtMs,
      ),
    ).toEqual([2_000 + METRICS_WINDOW_MS + 1]);
  });
});

describe('summariseSamples', () => {
  it('reports nothing without samples', () => {
    expect(summariseSamples([], 1_000)).toEqual({
      framesPerSecond: 0,
      latencyP50Ms: 0,
      latencyP95Ms: 0,
      sampleCount: 0,
    });
  });

  it('does not report a rate from a single sample', () => {
    expect(summariseSamples([sample(1_000, 400)], 1_100).framesPerSecond).toBe(
      0,
    );
  });

  it('measures rate across the span between samples', () => {
    const samples = [sample(0, 400), sample(500, 400), sample(1_000, 400)];

    expect(summariseSamples(samples, 1_000).framesPerSecond).toBeCloseTo(2);
  });

  it('reports latency percentiles', () => {
    const samples = [100, 200, 300, 400, 900].map((latency, index) =>
      sample(index * 100, latency),
    );
    const metrics = summariseSamples(samples, 400);

    expect(metrics.latencyP50Ms).toBe(300);
    expect(metrics.latencyP95Ms).toBe(900);
    expect(metrics.sampleCount).toBe(5);
  });
});
