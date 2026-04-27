// byred_os design system — single source of truth for every visual primitive.
// This object is the contract between Tailwind, CSS variables, and TS code.
// If a value isn't here, it doesn't ship.

export const brand = {
  red: '#D7261E',
  redHover: '#B51E18',
  redSubtle: '#FDF2F1',
  redMuted: 'rgba(215, 38, 30, 0.08)',
} as const

export const neutral = {
  canvas: '#FAFAFA',
  surface: '#FFFFFF',
  elevated: '#FFFFFF',
  overlay: 'rgba(10, 10, 10, 0.6)',
  borderSubtle: '#EEEEEE',
  borderDefault: '#E4E4E7',
  borderFocus: '#D7261E',
  textPrimary: '#0A0A0A',
  textSecondary: '#52525B',
  textTertiary: '#A1A1AA',
  textDisabled: '#D4D4D8',
  textInverse: '#FFFFFF',
} as const

export const semantic = {
  success: { fg: '#16A34A', bg: '#F0FDF4' },
  warning: { fg: '#CA8A04', bg: '#FEFCE8' },
  danger: { fg: '#DC2626', bg: '#FEF2F2' },
  info: { fg: '#2563EB', bg: '#EFF6FF' },
  neutral: { fg: '#71717A', bg: '#F4F4F5' },
} as const

export const typography = {
  fontSans: "'Inter', system-ui, -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",
  scale: [11, 12, 13, 14, 16, 18, 22, 28, 36] as const,
  weights: [400, 500, 600, 700] as const,
  lineHeight: {
    body: 1.5,
    headings: 1.2,
    compact: 1.3,
  },
  tracking: {
    tight: '-0.01em',
    normal: '0',
    wide: '0.02em',
    caps: '0.08em',
  },
} as const

export const spacing = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96] as const

export const radius = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '9999px',
} as const

export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.04)',
  md: '0 4px 12px rgba(0,0,0,0.06)',
  lg: '0 12px 32px rgba(0,0,0,0.08)',
  xl: '0 24px 48px rgba(0,0,0,0.12)',
} as const

export const motion = {
  micro: '150ms ease-out',
  normal: '220ms ease-in-out',
  slow: '350ms ease-in-out',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  overlay: 30,
  modal: 40,
  toast: 50,
  tooltip: 60,
} as const

export const designTokens = Object.freeze({
  brand,
  neutral,
  semantic,
  typography,
  spacing,
  radius,
  shadows,
  motion,
  zIndex,
} as const)

export type DesignTokens = typeof designTokens
