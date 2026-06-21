export const Colors = {
  brand: {
    magenta: '#ef3d83',
    coral: '#ff7a59',
    gold: '#ffd166',
    teal: '#00b894',
    ink: '#251b3d',
    violet: '#6c4df6'
  },
  light: {
    background: '#fff7fb',
    card: 'rgba(255,255,255,0.82)',
    surface: '#ffffff',
    text: '#251b3d',
    subtext: '#6b7280',
    border: 'rgba(239,61,131,0.15)',
    danger: '#dc2626'
  },
  dark: {
    background: '#1a1225',
    card: 'rgba(40,30,60,0.82)',
    surface: '#281e3c',
    text: '#f9fafb',
    subtext: '#9ca3af',
    border: 'rgba(108,77,246,0.25)',
    danger: '#f87171'
  }
};

export type ThemePalette = typeof Colors.light;
