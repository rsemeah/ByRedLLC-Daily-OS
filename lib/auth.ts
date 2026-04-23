import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { CurrentUser, TenantAccess } from "@/lib/context/user-context"
import type { ByredTenant, ByredUser, ByredUserTenant } from "@/types/database"

/**
 * Get the current authenticated user with their byred_users profile and tenant access.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return null
  }

  // Fetch the byred_users profile linked to this auth user
  const { data: profile } = await supabase
    .from("byred_users")
    .select("*")
    .eq("auth_user_id", authUser.id)
    .maybeSingle()

  const typedProfile = (profile ?? null) as ByredUser | null

  // Fetch the user's tenant access with tenant details
  const { data: userTenants } = await supabase
    .from("byred_user_tenants")
    .select(
      `
      role,
      byred_tenants (
        id,
        name,
        type,
        color,
        active,
        monday_board_id,
        monday_group_id,
        created_at,
        updated_at
      )
    `
    )
    .eq("user_id", typedProfile?.id ?? "")

  const typedUserTenants = (userTenants ?? []) as Array<{
    role: ByredUserTenant["role"]
    byred_tenants: ByredTenant | ByredTenant[] | null
  }>

  const tenants: TenantAccess[] = typedUserTenants
    .filter((record) => record.byred_tenants)
    .map((record) => {
      const baseTenant = Array.isArray(record.byred_tenants)
        ? record.byred_tenants[0]
        : record.byred_tenants

      return {
        id: baseTenant?.id ?? "",
        name: baseTenant?.name ?? "Unknown tenant",
        type: baseTenant?.type ?? "service",
        color: baseTenant?.color ?? "#d90009",
        active: baseTenant?.active ?? true,
        monday_board_id: baseTenant?.monday_board_id ?? null,
        monday_group_id: baseTenant?.monday_group_id ?? null,
        created_at: baseTenant?.created_at ?? null,
        updated_at: baseTenant?.updated_at ?? null,
        role: record.role,
      }
    })

  const metadataTenantId =
    typeof authUser.user_metadata?.active_tenant_id === "string"
      ? authUser.user_metadata.active_tenant_id
      : null

  const activeTenantId =
    metadataTenantId && tenants.some((tenant) => tenant.id === metadataTenantId)
      ? metadataTenantId
      : tenants[0]?.id ?? null

  return {
    authUser,
    profile: typedProfile,
    tenants,
    activeTenantId,
    setActiveTenantId: async () => {
      throw new Error("setActiveTenantId is only available in client components")
    },
    isAdmin: typedProfile?.role === "admin",
    // Server-side consumers of this function don't render owner avatars;
    // the directory is only meaningful on the client. Layout separately
    // loads it for the TenantProvider.
    directory: [],
    directoryById: new Map(),
  }
}

/**
 * Require authentication. Redirects to login if not authenticated.
 */
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return user
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
