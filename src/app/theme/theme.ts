export const appTheme = {
  colors: {
    accent: '#1A6FEC',
    background: '#07111F',
    card: '#0E1C31',
    cardElevated: '#122745',
    border: '#1E4E91',
    borderSubtle: '#18375F',
    muted: '#91A9C9',
    mutedStrong: '#B4C8E4',
    text: '#F4F8FF',
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
