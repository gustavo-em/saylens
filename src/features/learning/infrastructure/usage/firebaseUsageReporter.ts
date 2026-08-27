import {
  getAnalytics,
  logEvent,
  logScreenView,
  setAnalyticsCollectionEnabled,
} from '@react-native-firebase/analytics';

import type { AppTab } from '../../../../app/navigation/AppTab';
import type { UsageReporter } from '../../application/ports/UsageReporter';

/** What each tab is called in the reports, so a chart reads like the app
 * rather than like its source. */
const SCREEN_NAMES: Record<AppTab, string> = {
  camera: 'Camera',
  history: 'My words',
  collection: 'Collection',
  quiz: 'Practice round',
  speak: 'Speak',
  settings: 'Settings',
  account: 'Account',
};

export const firebaseUsageReporter: UsageReporter = {
  async screenOpened(tab) {
    // Reporting is never worth an interrupted screen, so a failure here is
    // swallowed rather than raised.
    try {
      await logScreenView(getAnalytics(), {
        screen_name: SCREEN_NAMES[tab],
        screen_class: SCREEN_NAMES[tab],
      });
    } catch {
      // Nothing to do: the learner is mid-task.
    }
  },

  async appOpened(daysSinceLastOpen) {
    // The gap since the last visit is the whole question: a learner who comes
    // back the next day is the one the app is for.
    try {
      await logEvent(getAnalytics(), 'app_opened', {
        days_since_last_open: daysSinceLastOpen ?? -1,
        returned_next_day: daysSinceLastOpen === 1 ? 1 : 0,
      });
    } catch {
      // Same again.
    }
  },
};

/** Analytics is off until the app says otherwise, so nothing is collected
 * before this runs. */
export async function startUsageReporting() {
  try {
    await setAnalyticsCollectionEnabled(getAnalytics(), true);
  } catch {
    // Reporting is never worth an interrupted launch.
  }
}
