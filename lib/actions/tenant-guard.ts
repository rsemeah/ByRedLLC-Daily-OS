import { requireAuth } from "@/lib/auth"

export type TenantGuardContext = {
  profileId: string
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
