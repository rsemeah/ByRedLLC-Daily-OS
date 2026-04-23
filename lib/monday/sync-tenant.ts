import "server-only"

/**
 * Tenant that owns tasks created from Monday webhook events + board pulls.
 * Must match a row in `byred_tenants.id`. Unset → webhook/sync update linked
 * tasks only and skip unknown Monday items (no orphaned rows).
 */
export function mondaySyncTenantId(): string | null {
  const raw = process.env.MONDAY_SYNC_TENANT_ID?.trim()
  return raw && raw.length > 0 ? raw : null
}
