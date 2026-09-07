export type AppearanceMode = 'light' | 'dark';

export const appearanceModes: readonly AppearanceMode[] = ['light', 'dark'];

interface ThemeColors {
  accent: string;
  /** The accent as ink rather than as fill. The two have opposite
   * contrast needs against the same surface, and one value cannot serve
   * both: on the dark theme the fill colour reads at 2.6:1 as text. */
  accentText: string;
  /** What is written on top of an accent fill. The app background was used
   * for this, which on the dark theme is near-black on violet: 2.9:1. */
  onAccent: string;
  background: string;
  card: string;
  cardElevated: string;
  border: string;
  borderSubtle: string;
  glass: string;
  glassStrong: string;
  glassBlue: string;
  glassBorder: string;
  glassHighlight: string;
  muted: string;
  mutedStrong: string;
  text: string;
  /** Pronunciation outcome: a word already said right, and one still missed. */
  success: string;
  danger: string;
  /** Camera overlay palette. Identical in both themes: these sit on the video
   * feed, not on the app background. */
  overlayCard: string;
  /** The card standing beside an object lets the scene through, so it reads as
   * a panel in the room rather than a sticker on the screen. */
  overlayCardTranslucent: string;
  overlayCardBorder: string;
  /** The one call to action on a card sitting over the camera. It is the
   * brand's own blue rather than the app's quieter accent, because it has to
   * carry against a moving scene. */
  overlayAction: string;
  /** Controls that sit on the camera feed. Near-black and translucent: a blue
   * tint here reads as interface, and the scene behind should read as the
   * subject. */
  overlayGlass: string;
  overlayGlassBorder: string;
  overlayInk: string;
  overlayMuted: string;
  overlayRule: string;
  translationPrimary: string;
  translationSecondary: string;
}

export interface AppTheme {
  mode: AppearanceMode;
  colors: ThemeColors;
  radii: {
    medium: number;
    large: number;
    extraLarge: number;
    pill: number;
  };
  spacing: {
    small: number;
    medium: number;
    large: number;
    extraLarge: number;
  };
}

const sharedTheme = {
  radii: {
    medium: 14,
    large: 20,
    extraLarge: 28,
    pill: 999,
  },
  spacing: {
    small: 8,
    medium: 16,
    large: 24,
    extraLarge: 32,
  },
} as const;

export const darkTheme: AppTheme = {
  ...sharedTheme,
  mode: 'dark',
  colors: {
    // A calmer indigo than the #4153FB the brand started on: the same family,
    // but deeper and far less saturated, so the interface stops shouting over
    // the scene it is sitting on. The mark moved with it.
    accent: '#5E41D2',
    accentText: '#A796EE',
    onAccent: '#FFFFFF',
    // A neutral, near-black navy with only a trace of blue. The saturated
    // borders this replaced drew as much attention as the text inside them.
    background: '#070E18',
    card: '#101A28',
    cardElevated: '#16222F',
    border: '#243044',
    borderSubtle: '#1B2534',
    glass: 'rgba(7, 22, 43, 0.72)',
    glassStrong: 'rgba(5, 18, 37, 0.88)',
    glassBlue: 'rgba(94, 65, 210, 0.42)',
    glassBorder: 'rgba(188, 218, 255, 0.24)',
    glassHighlight: 'rgba(255, 255, 255, 0.20)',
    muted: '#8195AF',
    mutedStrong: '#B4C8E4',
    text: '#F2F6FC',
    success: '#3FCB86',
    danger: '#F87171',
    overlayCard: '#FFFFFF',
    overlayCardTranslucent: 'rgba(255, 255, 255, 0.82)',
    overlayCardBorder: 'rgba(255, 255, 255, 0.55)',
    overlayAction: '#5E41D2',
    overlayGlass: 'rgba(10, 14, 22, 0.55)',
    overlayGlassBorder: 'rgba(255, 255, 255, 0.14)',
    overlayInk: '#111827',
    overlayMuted: '#6B7280',
    overlayRule: '#E5E7EB',
    translationPrimary: '#5E41D2',
    translationSecondary: '#EF4444',
  },
};

export const lightTheme: AppTheme = {
  ...sharedTheme,
  mode: 'light',
  colors: {
    // A calmer indigo than the #4153FB the brand started on: the same family,
    // but deeper and far less saturated, so the interface stops shouting over
    // the scene it is sitting on. The mark moved with it.
    accent: '#5E41D2',
    accentText: '#5E41D2',
    onAccent: '#FFFFFF',
    background: '#F1EFFA',
    card: '#FFFFFF',
    cardElevated: '#EDE9FA',
    border: '#BFB6E4',
    borderSubtle: '#DAD4F2',
    glass: 'rgba(255, 255, 255, 0.78)',
    glassStrong: 'rgba(250, 249, 255, 0.92)',
    glassBlue: 'rgba(94, 65, 210, 0.16)',
    glassBorder: 'rgba(72, 52, 153, 0.20)',
    glassHighlight: 'rgba(255, 255, 255, 0.88)',
    muted: '#67628A',
    mutedStrong: '#4C3E83',
    text: '#1A1533',
    success: '#178A52',
    danger: '#D22C2C',
    overlayCard: '#FFFFFF',
    overlayCardTranslucent: 'rgba(255, 255, 255, 0.82)',
    overlayCardBorder: 'rgba(255, 255, 255, 0.55)',
    overlayAction: '#5E41D2',
    overlayGlass: 'rgba(10, 14, 22, 0.55)',
    overlayGlassBorder: 'rgba(255, 255, 255, 0.14)',
    overlayInk: '#111827',
    overlayMuted: '#6B7280',
    overlayRule: '#E5E7EB',
    translationPrimary: '#5E41D2',
    translationSecondary: '#EF4444',
  },
};

export function getAppTheme(mode: AppearanceMode) {
  return mode === 'dark' ? darkTheme : lightTheme;
}

export const appTheme = darkTheme;
