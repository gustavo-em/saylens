import { Platform } from 'react-native';

import type { CloudDeviceRecord } from '../../../features/learning/application/ports/CloudLearningStore';
import { APP_VERSION } from '../../config/appMetadata';
import { getDeviceLanguageTags } from '../locale/deviceLanguageTags';

/**
 * What the app can say about where it is running.
 *
 * Everything here is either a constant of the build or a setting the learner
 * chose themselves. Nothing is read from the hardware, so two people on the
 * same model are indistinguishable in it: there is no advertising id, no
 * serial, and no location.
 */
export function getCurrentDeviceRecord(
  lastSeenAtMs: number,
): CloudDeviceRecord {
  // A record that cannot name the platform says 'other' rather than throwing.
  // This runs from a debounced save, which can land after the screen that
  // scheduled it is gone, and a crash there would lose the save and the app
  // with it.
  const platform = Platform?.OS;

  return {
    lastSeenAtMs,
    appVersion: APP_VERSION,
    platform: platform === 'ios' || platform === 'android' ? platform : 'other',
    osVersion: Platform?.Version == null ? '' : String(Platform.Version),
    locale: getDeviceLanguageTags()[0] ?? null,
  };
}
