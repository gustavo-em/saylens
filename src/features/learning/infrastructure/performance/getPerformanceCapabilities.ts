import { objectDetector } from 'react-native-saylens-object-detector';

import {
  DEFAULT_PERFORMANCE_PROFILE,
  performanceProfiles,
  type PerformanceCapabilities,
} from '../../domain/PerformanceProfile';

export function getPerformanceCapabilities(): PerformanceCapabilities {
  return {
    maximumCpuWorkerCount: Math.max(
      1,
      Math.round(objectDetector.getRecommendedCpuWorkerCount()),
    ),
    recommendedProfile: DEFAULT_PERFORMANCE_PROFILE,
    supportsGpuDelegate: objectDetector.getSupportsGpuDelegate(),
    supportedProfiles: performanceProfiles,
  };
}
