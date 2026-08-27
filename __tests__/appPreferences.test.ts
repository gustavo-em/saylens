import {
  DEFAULT_APP_PREFERENCES,
  sanitizeAppPreferences,
  type AppPreferences,
} from '../src/app/domain/AppPreferences';

const stored: AppPreferences = {
  appearanceMode: 'light',
  showDiagnostics: true,
  hasSeenOnboarding: true,
  learningLanguage: 'es',
  nativeLanguage: 'en-US',
  performanceProfile: 'power-saving',
};

describe('sanitizeAppPreferences', () => {
  it('restores every stored preference', () => {
    expect(sanitizeAppPreferences(stored)).toEqual(stored);
  });

  it('falls back to the defaults when nothing was stored', () => {
    expect(sanitizeAppPreferences(null)).toEqual(DEFAULT_APP_PREFERENCES);
    expect(sanitizeAppPreferences(undefined)).toEqual(DEFAULT_APP_PREFERENCES);
    expect(sanitizeAppPreferences('not an object')).toEqual(
      DEFAULT_APP_PREFERENCES,
    );
  });

  it('discards values that are no longer valid', () => {
    expect(
      sanitizeAppPreferences({
        appearanceMode: 'sepia',
        learningLanguage: 'fr',
        nativeLanguage: 42,
        performanceProfile: 'ultra-performance',
      }),
    ).toEqual(DEFAULT_APP_PREFERENCES);
  });

  it('keeps the valid half of a partially corrupted payload', () => {
    expect(
      sanitizeAppPreferences({ appearanceMode: 'light', learningLanguage: 99 }),
    ).toEqual({
      ...DEFAULT_APP_PREFERENCES,
      appearanceMode: 'light',
    });
  });

  it('rejects a profile the device does not support', () => {
    expect(
      sanitizeAppPreferences(
        { performanceProfile: 'maximum-performance' },
        { ...DEFAULT_APP_PREFERENCES, performanceProfile: 'power-saving' },
        ['power-saving'],
      ).performanceProfile,
    ).toBe('power-saving');
  });

  it('prefers the supplied defaults over the built-in ones', () => {
    expect(
      sanitizeAppPreferences(
        {},
        { ...DEFAULT_APP_PREFERENCES, nativeLanguage: 'es' },
      ),
    ).toEqual({ ...DEFAULT_APP_PREFERENCES, nativeLanguage: 'es' });
  });
});
