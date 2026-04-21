import { getCurrentUser, requireAuth } from "@/lib/auth"

export type TenantGuardContext = {
  profileId: string
}

export type TenantApiGuardResult =
  | { ok: true; profileId: string }
  | { ok: false; status: number; error: string }

/**
 * Same membership checks as {@link requireTenantAccess}, but for Route Handlers:
 * returns JSON-safe status codes instead of calling `redirect()`.
 */
export async function assertTenantApiAccess(
  tenantId: string
): Promise<TenantApiGuardResult> {
  const user = await getCurrentUser()
  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized." }
  }
  if (!user.tenants.some((t) => t.id === tenantId)) {
    return {
      ok: false,
      status: 403,
      error: "You do not have access to this workspace.",
    }
  }
  const profileId = user.profile?.id
  if (!profileId) {
    return { ok: false, status: 403, error: "Your profile is not set up yet." }
  }
  return { ok: true, profileId }
}

/**
 * Ensures the session user is a member of `tenantId` and has a byred_users profile.
 */
export async function requireTenantAccess(
  tenantId: string
): Promise<TenantGuardContext> {
  const user = await requireAuth()

  if (!user.tenants.some((t) => t.id === tenantId)) {
    throw new Error("You do not have access to this workspace.")
  }

  const profileId = user.profile?.id
  if (!profileId) {
    throw new Error("Your profile is not set up yet.")
  }

  return { profileId }
}
