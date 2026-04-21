import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { CurrentUser } from "@/lib/context/user-context"

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
      role: ut.role,
    }))

  return {
    authUser,
    profile,
    tenants,
    isAdmin: profile?.role === "admin",
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
