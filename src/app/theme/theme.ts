export type AppearanceMode = 'light' | 'dark';

export const appearanceModes: readonly AppearanceMode[] = ['light', 'dark'];

interface ThemeColors {
  accent: string;
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
    // The brand's indigo rather than a plain blue: the mark is #4153FB, and an
    // accent that leans away from it makes the app look like someone else's.
    accent: '#3A44E8',
    // A neutral, near-black navy with only a trace of blue. The saturated
    // borders this replaced drew as much attention as the text inside them.
    background: '#070E18',
    card: '#101A28',
    cardElevated: '#16222F',
    border: '#243044',
    borderSubtle: '#1B2534',
    glass: 'rgba(7, 22, 43, 0.72)',
    glassStrong: 'rgba(5, 18, 37, 0.88)',
    glassBlue: 'rgba(58, 68, 232, 0.42)',
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
    overlayAction: '#4153FB',
    overlayGlass: 'rgba(10, 14, 22, 0.55)',
    overlayGlassBorder: 'rgba(255, 255, 255, 0.14)',
    overlayInk: '#111827',
    overlayMuted: '#6B7280',
    overlayRule: '#E5E7EB',
    translationPrimary: '#3A44E8',
    translationSecondary: '#EF4444',
  },
};

export const lightTheme: AppTheme = {
  ...sharedTheme,
  mode: 'light',
  colors: {
    // The brand's indigo rather than a plain blue: the mark is #4153FB, and an
    // accent that leans away from it makes the app look like someone else's.
    accent: '#3A44E8',
    background: '#EFF5FD',
    card: '#FFFFFF',
    cardElevated: '#E7F0FC',
    border: '#9CBCE5',
    borderSubtle: '#C9DBF1',
    glass: 'rgba(255, 255, 255, 0.78)',
    glassStrong: 'rgba(247, 251, 255, 0.92)',
    glassBlue: 'rgba(58, 68, 232, 0.16)',
    glassBorder: 'rgba(52, 96, 153, 0.20)',
    glassHighlight: 'rgba(255, 255, 255, 0.88)',
    muted: '#607A9B',
    mutedStrong: '#3E5D83',
    text: '#0A1A30',
    success: '#178A52',
    danger: '#D22C2C',
    overlayCard: '#FFFFFF',
    overlayCardTranslucent: 'rgba(255, 255, 255, 0.82)',
    overlayCardBorder: 'rgba(255, 255, 255, 0.55)',
    overlayAction: '#4153FB',
    overlayGlass: 'rgba(10, 14, 22, 0.55)',
    overlayGlassBorder: 'rgba(255, 255, 255, 0.14)',
    overlayInk: '#111827',
    overlayMuted: '#6B7280',
    overlayRule: '#E5E7EB',
    translationPrimary: '#3A44E8',
    translationSecondary: '#EF4444',
  },
};

export function getAppTheme(mode: AppearanceMode) {
  return mode === 'dark' ? darkTheme : lightTheme;
}

export const appTheme = darkTheme;
