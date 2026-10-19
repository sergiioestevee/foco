export const colors = {
  light: {
    bg: '#F4F4F7',
    surf: '#FFFFFF',
    line: '#E3E3EA',
    track: '#EAEAF0',
    text: '#14141A',
    muted: '#5D5E6A',
    accent: '#4B4EE0',
    accentInk: '#FFFFFF',
    ring: '#14141A',
    warn: '#A65A00',
    ok: '#1E7A4A',
    danger: '#C2413B',
    aiBg: '#ECECFF',
    scrim: '#14141A66',
    shadow: '#14141A',
  },
  dark: {
    bg: '#0E0F13',
    surf: '#181A20',
    line: '#2A2D36',
    track: '#262932',
    text: '#F3F3F1',
    muted: '#A0A3AD',
    accent: '#8B8FFF',
    accentInk: '#0E0F13',
    ring: '#FFFFFF',
    warn: '#F2B56B',
    ok: '#7FD6A4',
    danger: '#F18A85',
    aiBg: '#1D1E3D',
    scrim: '#00000099',
    shadow: '#000000',
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ThemeColors = (typeof colors)[ColorScheme];

/** Diagonal gradient of the logo's centre dot (also used inside ProgressRing). */
export const dotGradient = {
  light: ['#7478FF', '#4B4EE0'],
  dark: ['#8B8FFF', '#5B5EF0'],
} as const;

/** Colours offered when creating a subject, project or schedule block. Readable on both themes. */
export const categoryColors = [
  '#8B8FFF',
  '#7FD6A4',
  '#F2B56B',
  '#E990A5',
  '#8FC3E8',
  '#B79AE8',
  '#F1AC81',
  '#A3B88A',
] as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 12,
  button: 16,
  chip: 18,
  card: 22,
  pill: 999,
} as const;

/** Minimum touch target in points. */
export const minTouchSize = 44;
