import { AppSidebar } from "@/components/byred/sidebar"
import { AppTopbar } from "@/components/byred/topbar"
import { CommandPalette } from "@/components/byred/command-palette"
import { getDailyBriefForSession } from "@/lib/data/daily-briefs"
import { TenantProvider } from "@/lib/context/user-context"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { ByredTenant, ByredUser, ByredUserTenant } from "@/types/database"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    redirect("/login")
  }

  const { data: profile, error: profileError } = await supabase
    .from("byred_users")
    .select("*")
    .eq("auth_user_id", authUser.id)
    .maybeSingle()

  if (profileError) {
    console.error("Failed to fetch byred_users profile", profileError)
  }

  if (!profile) {
    redirect("/onboarding")
  }

  const typedProfile = profile as ByredUser
  const userId = typedProfile.id

  const { data: userTenants, error: tenantError } = await supabase
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
    .eq("user_id", userId)

  if (tenantError) {
    console.error("Failed to fetch user tenants", tenantError)
    redirect("/onboarding")
  }

  const typedUserTenants = (userTenants ?? []) as Array<{
    role: ByredUserTenant["role"]
    byred_tenants: ByredTenant | ByredTenant[] | null
  }>

  const tenants = typedUserTenants
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

  if (tenants.length === 0) {
    redirect("/onboarding")
  }

  const metadataTenantId =
    typeof authUser.user_metadata?.active_tenant_id === "string"
      ? authUser.user_metadata.active_tenant_id
      : null

  const initialActiveTenantId =
    metadataTenantId && tenants.some((tenant) => tenant.id === metadataTenantId)
      ? metadataTenantId
      : tenants[0]?.id ?? null

  const dailyBrief = await getDailyBriefForSession()

  // Directory: byred_users visible via RLS (tenant peers + Monday-imported
  // roster). Powers owner avatars on task / lead rows without each row
  // component firing its own fetch.
  const { data: directoryRows } = await supabase
    .from("byred_users")
    .select("id, name, email, avatar_url, role")
    .eq("active", true)

  const directory = ((directoryRows ?? []) as Array<{
    id: string
    name: string
    email: string
    avatar_url: string | null
    role: string | null
  }>).map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    avatar_url: r.avatar_url,
    role: r.role,
  }))

  return (
    <TenantProvider
      user={{
        authUser,
        profile: typedProfile,
        tenants,
        initialActiveTenantId,
        directory,
      }}
    >
      <CommandPalette />
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col ml-60">
          <AppTopbar
            initialBrief={dailyBrief.summary}
            initialBriefDate={dailyBrief.date}
          />
          <main className="flex-1 pt-14 px-8 py-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </TenantProvider>
  )
}
