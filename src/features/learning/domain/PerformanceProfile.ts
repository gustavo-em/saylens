export const performanceProfiles = ['high-performance', 'low-device'] as const;

export type PerformanceProfile = (typeof performanceProfiles)[number];

export const DEFAULT_PERFORMANCE_PROFILE: PerformanceProfile =
  'high-performance';

export const performanceProfileSettings: Record<
  PerformanceProfile,
  { workerCount: number }
> = {
  'high-performance': { workerCount: 4 },
  'low-device': { workerCount: 2 },
};
