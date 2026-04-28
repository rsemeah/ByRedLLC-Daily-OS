import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { Tenant } from "@/types/db"

export type TenantScope = {
  tenantId: string
  tenant: Tenant
}

/**
 * Require that the current request has a valid tenant scope.
 * Reads tenant_id from searchParams. If not provided, uses the user's first active tenant.
 * Redirects to /login if unauthenticated, or /dashboard if no valid tenant found.
 */
export async function requireTenantScope(
  requestedTenantId?: string | null
): Promise<TenantScope> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // If a specific tenant was requested, verify the user has access to it
  if (requestedTenantId) {
    const { data: tenant } = await supabase
      .from("byred_tenants")
      .select("*")
      .eq("id", requestedTenantId)
      .eq("active", true)
      .single()

    if (tenant) {
      return {
        tenantId: tenant.id,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          type: tenant.type as Tenant["type"],
          color: tenant.color,
          active: tenant.active ?? true,
          created_at: tenant.created_at ?? new Date().toISOString(),
          updated_at: tenant.updated_at ?? new Date().toISOString(),
        },
      }
    }
  }

  // Fall back to first active tenant
  const { data: tenants } = await supabase
    .from("byred_tenants")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true })
    .limit(1)

  const first = tenants?.[0]
  if (!first) redirect("/dashboard")

  return {
    tenantId: first.id,
    tenant: {
      id: first.id,
      name: first.name,
      type: first.type as Tenant["type"],
      color: first.color,
      active: first.active ?? true,
      created_at: first.created_at ?? new Date().toISOString(),
      updated_at: first.updated_at ?? new Date().toISOString(),
    },
  }
}
