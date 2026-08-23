import { objectDetector } from 'react-native-spellforme-object-detector';

import {
  DEFAULT_PERFORMANCE_PROFILE,
  performanceProfiles,
  type PerformanceCapabilities,
  type PerformanceProfile,
} from '../../domain/PerformanceProfile';

const LOW_DEVICE_PROFILE: PerformanceProfile = 'low-device';

export function getPerformanceCapabilities(): PerformanceCapabilities {
  const supportedProfiles = objectDetector
    .getSupportedPerformanceProfiles()
    .filter(isPerformanceProfile);
  const safeSupportedProfiles = supportedProfiles.length
    ? supportedProfiles
    : [LOW_DEVICE_PROFILE];
  const recommendation = objectDetector.getRecommendedPerformanceProfile();
  const recommendedProfile = safeSupportedProfiles.includes(
    recommendation as PerformanceProfile,
  )
    ? (recommendation as PerformanceProfile)
    : safeSupportedProfiles.includes(DEFAULT_PERFORMANCE_PROFILE)
    ? DEFAULT_PERFORMANCE_PROFILE
    : safeSupportedProfiles[0];

  return {
    highPerformanceCpuWorkerCount: Math.max(
      2,
      Math.round(objectDetector.getRecommendedCpuWorkerCount()),
    ),
    recommendedProfile,
    supportedProfiles: safeSupportedProfiles,
  };
}

function isPerformanceProfile(value: string): value is PerformanceProfile {
  return performanceProfiles.includes(value as PerformanceProfile);
}
