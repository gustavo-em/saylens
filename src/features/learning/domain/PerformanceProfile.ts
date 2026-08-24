export const performanceProfiles = [
  'maximum-performance',
  'power-saving',
] as const;

export type PerformanceProfile = (typeof performanceProfiles)[number];

export interface PerformanceCapabilities {
  maximumCpuWorkerCount: number;
  recommendedProfile: PerformanceProfile;
  supportsGpuDelegate: boolean;
  supportedProfiles: readonly PerformanceProfile[];
}

export const DEFAULT_PERFORMANCE_PROFILE: PerformanceProfile =
  'maximum-performance';

export function getPerformanceProfileSettings(
  profile: PerformanceProfile,
  capabilities: PerformanceCapabilities,
) {
  if (profile === 'power-saving') {
    return {
      cpuWorkerCount: 1,
      gpuWorkerCount: 0,
    };
  }

  return {
    cpuWorkerCount: capabilities.maximumCpuWorkerCount,
    gpuWorkerCount: capabilities.supportsGpuDelegate ? 1 : 0,
  };
}
