import { NativeModules, Platform } from 'react-native';

import type {
  PractiseReminder,
  PractiseReminderCapabilities,
} from '../../application/ports/PractiseReminder';

interface NativePractiseReminderModule {
  capabilities(): Promise<PractiseReminderCapabilities>;
  scheduleAlarm(hour: number, minute: number, label: string): Promise<void>;
  scheduleCalendarEvent(
    hour: number,
    minute: number,
    title: string,
    note: string,
  ): Promise<void>;
}

const NOTHING: PractiseReminderCapabilities = { alarm: false, calendar: false };

function getNativeModule(): NativePractiseReminderModule | null {
  // Android only for now. iOS has EventKit for the calendar and no public API
  // for the clock at all, so a half-feature there would be worse than none.
  if (Platform.OS !== 'android') return null;

  return (
    (NativeModules.LesingoPractiseReminder as
      | NativePractiseReminderModule
      | undefined) ?? null
  );
}

export const systemPractiseReminder: PractiseReminder = {
  async capabilities() {
    const native = getNativeModule();
    if (native == null) return NOTHING;

    // A phone with no clock or no calendar app is unusual but not impossible,
    // and a button that leads nowhere is worse than a button that is not there.
    try {
      return await native.capabilities();
    } catch {
      return NOTHING;
    }
  },

  async scheduleAlarm(hour, minute, label) {
    const native = getNativeModule();
    if (native == null) return;

    await native.scheduleAlarm(hour, minute, label);
  },

  async scheduleCalendarEvent(hour, minute, title, note) {
    const native = getNativeModule();
    if (native == null) return;

    await native.scheduleCalendarEvent(hour, minute, title, note);
  },
};
