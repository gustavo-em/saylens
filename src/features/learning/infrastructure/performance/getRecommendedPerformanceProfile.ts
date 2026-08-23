import { objectDetector } from 'react-native-spellforme-object-detector';

import {
  DEFAULT_PERFORMANCE_PROFILE,
  performanceProfiles,
  type PerformanceProfile,
} from '../../domain/PerformanceProfile';

export function getRecommendedPerformanceProfile(): PerformanceProfile {
  const recommendation = objectDetector.getRecommendedPerformanceProfile();

  return performanceProfiles.includes(recommendation as PerformanceProfile)
    ? (recommendation as PerformanceProfile)
    : DEFAULT_PERFORMANCE_PROFILE;
}
