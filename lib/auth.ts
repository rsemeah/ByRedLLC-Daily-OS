import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { SerializedUser, DirectoryEntry } from "@/lib/context/user-context"

/**
 * Get the current authenticated user with their byred_users profile, tenant access, and org directory.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<SerializedUser | null> {
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
    .single()

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
        created_at,
        updated_at
      )
    `
    )
    .eq("user_id", profile?.id ?? "")

  const tenants = (userTenants ?? [])
    .filter((ut) => ut.byred_tenants)
    .map((ut) => ({
      ...(ut.byred_tenants as NonNullable<typeof ut.byred_tenants>),
      role: ut.role as string,
    }))

  // Fetch org directory: all active users except self
  const { data: directoryData } = await supabase
    .from("byred_users")
    .select("id, name, email, role, monday_user_id, avatar_url")
    .eq("active", true)
    .neq("id", profile?.id ?? "")
    .order("name")

  const directory: DirectoryEntry[] = (directoryData ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    monday_user_id: (u as Record<string, unknown>).monday_user_id as string | null,
    avatar_url: u.avatar_url,
  }))

  const user: SerializedUser = {
    authUser,
    profile,
    tenants,
    isAdmin: profile?.role === "admin",
    activeTenantId: tenants[0]?.id ?? null,
    directory,
  }

  return user
}

/**
 * Require authentication. Redirects to login if not authenticated.
 */
export async function requireAuth(): Promise<SerializedUser> {
  const result = await getCurrentUser()

  if (!result) {
    redirect("/login")
  }

  return result
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
