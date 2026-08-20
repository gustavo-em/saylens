export const appTheme = {
  colors: {
    accent: '#70F1B5',
    background: '#07130F',
    card: '#10241C',
    cardElevated: '#153126',
    border: '#275442',
    borderSubtle: '#1E4033',
    muted: '#9AB7AA',
    mutedStrong: '#B1C9BE',
    text: '#F2FFF8',
  },
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

export type AppTheme = typeof appTheme;
