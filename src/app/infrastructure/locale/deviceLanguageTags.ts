import { NativeModules, Platform } from 'react-native';

/**
 * The languages the device is set to, most wanted first, as BCP 47 tags.
 *
 * Two sources are read rather than one. The platform's own settings hold the
 * ordered list the learner arranged, which is the answer worth having, but the
 * modules exposing it are optional and absent under a test renderer. Intl is
 * asked afterwards as a floor: it only ever knows the single resolved locale,
 * which is still better than opening in a language nobody chose.
 *
 * Nothing here throws. A device that answers none of it simply reports no
 * languages, and the caller keeps its own default.
 */
export function getDeviceLanguageTags(): readonly string[] {
  const tags: string[] = [];

  try {
    if (Platform.OS === 'ios') {
      const settings = NativeModules.SettingsManager?.settings;

      if (Array.isArray(settings?.AppleLanguages)) {
        tags.push(...settings.AppleLanguages.filter(isTag));
      }
      if (isTag(settings?.AppleLocale)) tags.push(settings.AppleLocale);
    } else {
      const identifier = NativeModules.I18nManager?.localeIdentifier;

      if (isTag(identifier)) tags.push(identifier);
    }
  } catch {
    // An absent native module is a device that cannot say, not a failure.
  }

  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().locale;

    if (isTag(resolved)) tags.push(resolved);
  } catch {
    // Intl is compiled out of some Hermes builds.
  }

  return tags;
}

function isTag(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
