export const performanceProfiles = [
  'ultra-performance',
  'high-performance',
  'low-device',
] as const;

export type PerformanceProfile = (typeof performanceProfiles)[number];

export const DEFAULT_PERFORMANCE_PROFILE: PerformanceProfile =
  'high-performance';

export const performanceProfileSettings: Record<
  PerformanceProfile,
  { cpuWorkerCount: number; gpuWorkerCount: number }
> = {
  'ultra-performance': { cpuWorkerCount: 4, gpuWorkerCount: 1 },
  'high-performance': { cpuWorkerCount: 4, gpuWorkerCount: 0 },
  'low-device': { cpuWorkerCount: 2, gpuWorkerCount: 0 },
};
