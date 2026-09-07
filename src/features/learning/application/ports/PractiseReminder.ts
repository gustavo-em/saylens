/** Which of the phone's own apps can take a reminder on this device. */
export interface PractiseReminderCapabilities {
  alarm: boolean;
  calendar: boolean;
}

/**
 * Hands a daily practice reminder to the phone rather than keeping one.
 *
 * The app owns no schedule and no notification of its own: it opens the clock
 * or the calendar with the fields filled and the learner decides there. That
 * keeps the reminder somewhere they already look, and keeps this app out of
 * their agenda.
 */
export interface PractiseReminder {
  capabilities(): Promise<PractiseReminderCapabilities>;
  /** Repeats every day, because that is what a streak asks for. */
  scheduleAlarm(hour: number, minute: number, label: string): Promise<void>;
  scheduleCalendarEvent(
    hour: number,
    minute: number,
    title: string,
    note: string,
  ): Promise<void>;
}
