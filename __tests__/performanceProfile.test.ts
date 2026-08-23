import {
  getPerformanceProfileSettings,
  type PerformanceCapabilities,
} from '../src/features/learning/domain/PerformanceProfile';

const capabilities: PerformanceCapabilities = {
  highPerformanceCpuWorkerCount: 6,
  recommendedProfile: 'high-performance',
  supportedProfiles: ['ultra-performance', 'high-performance', 'low-device'],
};

describe('getPerformanceProfileSettings', () => {
  it('calibrates up to the device limit in high-performance mode', () => {
    expect(
      getPerformanceProfileSettings('high-performance', capabilities),
    ).toEqual({
      calibrateCpuWorkers: true,
      cpuWorkerCount: 6,
      gpuWorkerCount: 0,
    });
  });

  it('keeps the GPU active while calibrating ultra-performance mode', () => {
    expect(
      getPerformanceProfileSettings('ultra-performance', capabilities),
    ).toEqual({
      calibrateCpuWorkers: true,
      cpuWorkerCount: 6,
      gpuWorkerCount: 1,
    });
  });

  it('skips calibration and caps low-end devices at two workers', () => {
    expect(getPerformanceProfileSettings('low-device', capabilities)).toEqual({
      calibrateCpuWorkers: false,
      cpuWorkerCount: 2,
      gpuWorkerCount: 0,
    });
  });
});
