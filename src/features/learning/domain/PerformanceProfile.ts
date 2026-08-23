export const performanceProfiles = [
  'ultra-performance',
  'high-performance',
  'low-device',
] as const;

export type PerformanceProfile = (typeof performanceProfiles)[number];

export interface PerformanceCapabilities {
  highPerformanceCpuWorkerCount: number;
  recommendedProfile: PerformanceProfile;
  supportedProfiles: readonly PerformanceProfile[];
}

export const DEFAULT_PERFORMANCE_PROFILE: PerformanceProfile =
  'high-performance';

export function getPerformanceProfileSettings(
  profile: PerformanceProfile,
  capabilities: PerformanceCapabilities,
) {
  if (profile === 'low-device') {
    return {
      calibrateCpuWorkers: false,
      cpuWorkerCount: 1,
      gpuWorkerCount: 0,
    };
  }

  return {
    calibrateCpuWorkers: true,
    cpuWorkerCount: capabilities.highPerformanceCpuWorkerCount,
    gpuWorkerCount: profile === 'ultra-performance' ? 1 : 0,
  };
}
