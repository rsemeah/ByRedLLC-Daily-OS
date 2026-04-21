import { requireAuth } from "@/lib/auth"

export type TenantScope = {
  tenantIds: string[]
  profileId: string | null
}

/**
 * Authenticated user plus tenant membership IDs for server-side queries.
 */
export async function requireTenantScope(): Promise<TenantScope> {
  const user = await requireAuth()
  return {
    tenantIds: user.tenants.map((t) => t.id).filter(Boolean),
    profileId: user.profile?.id ?? null,
  }
}

export function assertTenantInScope(
  tenantId: string,
  tenantIds: string[]
): boolean {
  return tenantIds.includes(tenantId)
}
