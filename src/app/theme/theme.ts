export const appTheme = {
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
