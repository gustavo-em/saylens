import {
  getPerformanceProfileSettings,
  type PerformanceCapabilities,
} from '../src/features/learning/domain/PerformanceProfile';

const capabilities: PerformanceCapabilities = {
  maximumCpuWorkerCount: 6,
  recommendedProfile: 'maximum-performance',
  supportsGpuDelegate: true,
  supportedProfiles: ['maximum-performance', 'power-saving'],
};

describe('getPerformanceProfileSettings', () => {
  it('uses every sustainable CPU worker alongside the GPU', () => {
    expect(
      getPerformanceProfileSettings('maximum-performance', capabilities),
    ).toEqual({
      cpuWorkerCount: 6,
      gpuWorkerCount: 1,
    });
  });

  it('uses the minimum resources in power-saving mode', () => {
    expect(getPerformanceProfileSettings('power-saving', capabilities)).toEqual(
      {
        cpuWorkerCount: 1,
        gpuWorkerCount: 0,
      },
    );
  });

  it('keeps maximum CPU throughput when the GPU delegate is unsafe', () => {
    expect(
      getPerformanceProfileSettings('maximum-performance', {
        ...capabilities,
        supportsGpuDelegate: false,
      }),
    ).toEqual({
      cpuWorkerCount: 6,
      gpuWorkerCount: 0,
    });
  });
});
