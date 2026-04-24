// ByRed OS design tokens. Source of truth for the tasks-page surface.
// Brand red is sampled from the BY RED LLC logo (`public/brand/by-red-logo.png`).
export const tokens = {
  bgBase: '#f7f7f7',
  bgSurface: '#ffffff',
  bgSidebar: '#ffffff',
  bgHover: '#fafafa',
  bgActiveNav: '#fff8f8',

  red: '#D02C2A',
  redHover: '#A02220',
  redLight: '#fde8e8',
  redBorder: '#f5c0c0',
  redSubtle: '#fff8f8',

  textPrimary: '#000000',
  textSecondary: '#111111',
  textMuted: '#aaaaaa',
  textFaint: '#cccccc',
  textPlaceholder: '#cccccc',

  borderDefault: '#e8e8e8',
  borderSubtle: '#ebebeb',
  borderStrong: '#dddddd',

  doneText: '#2a7a3a',
  doneBg: '#f0faf4',
  doneBorder: '#c8e6d0',

  progressText: '#D02C2A',
  progressBg: '#fff8f8',
  progressBorder: '#f5c0c0',

  blockedText: '#ffffff',
  blockedBg: '#D02C2A',
  blockedBorder: '#D02C2A',

  notStartedText: '#bbbbbb',
  notStartedBg: '#f7f7f7',
  notStartedBorder: '#e8e8e8',

  hireWireText: '#3355bb',
  hireWireBg: '#f0f4ff',
  hireWireBorder: '#d0d8f5',

  paradiseText: '#2a7a3a',
  paradiseBg: '#f0faf4',
  paradiseBorder: '#c8e6d0',

  hadithText: '#aa5500',
  hadithBg: '#fff8f0',
  hadithBorder: '#f0d5b0',

  byredText: '#D02C2A',
  byredBg: '#fde8e8',
  byredBorder: '#f5c0c0',
} as const

export type Tokens = typeof tokens
