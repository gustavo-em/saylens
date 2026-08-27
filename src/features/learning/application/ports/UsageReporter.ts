import type { AppTab } from '../../../../app/navigation/AppTab';

/**
 * Reports what the app is being used for.
 *
 * Two questions pay for this: which screens a learner actually opens, and
 * whether they come back the next day. Everything else is noise that costs
 * privacy and answers nothing.
 */
export interface UsageReporter {
  /** The learner opened a screen. */
  screenOpened(tab: AppTab): Promise<void>;
  /** The app was opened, with how many days have passed since it last was. */
  appOpened(daysSinceLastOpen: number | null): Promise<void>;
}
