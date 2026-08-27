import type { AppTab } from '../../../../app/navigation/AppTab';

/**
 * Reports what the app is being used for.
 *
 * Three questions pay for this: which screens a learner actually opens,
 * whether they come back the next day, and which words they decide to say
 * out loud. Everything else is noise that costs privacy and answers nothing.
 */
export interface UsageReporter {
  /** The learner opened a screen. */
  screenOpened(tab: AppTab): Promise<void>;
  /** The app was opened, with how many days have passed since it last was. */
  appOpened(daysSinceLastOpen: number | null): Promise<void>;
  /** The learner chose to practise a word, and where they chose it from. */
  speakingStarted(label: string, from: AppTab): Promise<void>;
}
