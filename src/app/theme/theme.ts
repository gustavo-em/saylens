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
    accent: '#1A6FEC',
    background: '#07111F',
    card: '#0E1C31',
    cardElevated: '#122745',
    border: '#1E4E91',
    borderSubtle: '#18375F',
    glass: 'rgba(7, 22, 43, 0.72)',
    glassStrong: 'rgba(5, 18, 37, 0.88)',
    glassBlue: 'rgba(26, 111, 236, 0.42)',
    glassBorder: 'rgba(188, 218, 255, 0.24)',
    glassHighlight: 'rgba(255, 255, 255, 0.20)',
    muted: '#91A9C9',
    mutedStrong: '#B4C8E4',
    text: '#F4F8FF',
  },
};

export const lightTheme: AppTheme = {
  ...sharedTheme,
  mode: 'light',
  colors: {
    accent: '#1A6FEC',
    background: '#EFF5FD',
    card: '#FFFFFF',
    cardElevated: '#E7F0FC',
    border: '#9CBCE5',
    borderSubtle: '#C9DBF1',
    glass: 'rgba(255, 255, 255, 0.78)',
    glassStrong: 'rgba(247, 251, 255, 0.92)',
    glassBlue: 'rgba(26, 111, 236, 0.16)',
    glassBorder: 'rgba(52, 96, 153, 0.20)',
    glassHighlight: 'rgba(255, 255, 255, 0.88)',
    muted: '#607A9B',
    mutedStrong: '#3E5D83',
    text: '#0A1A30',
  },
};

export function getAppTheme(mode: AppearanceMode) {
  return mode === 'dark' ? darkTheme : lightTheme;
}

export const appTheme = darkTheme;
