export type TenantColorScheme = {
  dot: string
  chipBg: string
  chipText: string
  chipBorder: string
}

export const TENANT_COLORS: Record<string, TenantColorScheme> = {
  t1: {
    dot: '#D02C2A',
    chipBg: '#fde8e8',
    chipText: '#D02C2A',
    chipBorder: '#f5c0c0',
  },
  t2: {
    dot: '#2a7a3a',
    chipBg: '#f0faf4',
    chipText: '#2a7a3a',
    chipBorder: '#c8e6d0',
  },
  t3: {
    dot: '#3355bb',
    chipBg: '#f0f4ff',
    chipText: '#3355bb',
    chipBorder: '#d0d8f5',
  },
  t4: {
    dot: '#aa5500',
    chipBg: '#fff8f0',
    chipText: '#aa5500',
    chipBorder: '#f0d5b0',
  },
}

export const TENANT_NAMES: Record<string, string> = {
  t1: 'By Red LLC',
  t2: 'Paradise Property Services',
  t3: 'HireWire',
  t4: 'Authentic Hadith',
}

export const DEFAULT_TENANT_COLOR: TenantColorScheme = {
  dot: '#aaaaaa',
  chipBg: '#f0f0f0',
  chipText: '#aaaaaa',
  chipBorder: '#e8e8e8',
}

export function getTenantColors(tenantId: string | null | undefined): TenantColorScheme {
  if (!tenantId) return DEFAULT_TENANT_COLOR
  return TENANT_COLORS[tenantId] ?? DEFAULT_TENANT_COLOR
}
