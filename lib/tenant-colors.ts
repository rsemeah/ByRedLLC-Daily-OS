export type TenantColorScheme = {
  dot: string
  chipBg: string
  chipText: string
  chipBorder: string
}

/**
 * Legacy stub-ID map kept for local dev / Storybook scenarios where
 * real tenant UUIDs aren't available. In production the sidebar uses
 * tenant.color from the DB, so these stubs are never hit.
 */
const LEGACY_STUB_COLORS: Record<string, TenantColorScheme> = {
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

export const DEFAULT_TENANT_COLOR: TenantColorScheme = {
  dot: '#aaaaaa',
  chipBg: '#f0f0f0',
  chipText: '#aaaaaa',
  chipBorder: '#e8e8e8',
}

/**
 * Derive a full color scheme from a hex color string (e.g. tenant.color
 * from the byred_tenants table). Generates tinted bg/border automatically.
 */
function colorSchemeFromHex(hex: string): TenantColorScheme {
  return {
    dot: hex,
    chipBg: `${hex}18`,
    chipText: hex,
    chipBorder: `${hex}40`,
  }
}

/**
 * Get tenant color scheme. Accepts either:
 *   - A tenant ID (UUID or legacy stub like "t1")
 *   - A raw hex color string (e.g. "#D02C2A" from tenant.color column)
 *
 * Priority: raw hex arg → legacy stub map → default gray
 */
export function getTenantColors(
  tenantIdOrHex: string | null | undefined,
  hexColor?: string | null
): TenantColorScheme {
  // If caller passes the DB hex color directly, use it
  if (hexColor && hexColor.startsWith('#')) {
    return colorSchemeFromHex(hexColor)
  }
  if (!tenantIdOrHex) return DEFAULT_TENANT_COLOR
  // If it looks like a hex color itself
  if (tenantIdOrHex.startsWith('#')) {
    return colorSchemeFromHex(tenantIdOrHex)
  }
  // Fall back to legacy stub map (dev/test only)
  return LEGACY_STUB_COLORS[tenantIdOrHex] ?? DEFAULT_TENANT_COLOR
}
