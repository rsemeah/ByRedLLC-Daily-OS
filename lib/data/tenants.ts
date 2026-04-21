import { createClient } from "@/lib/supabase/server"
import type { Tenant } from "@/types/db"

export async function getTenants(): Promise<Tenant[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_tenants")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching tenants:", error)
    return []
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type as Tenant["type"],
    color: row.color,
    active: row.active ?? true,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
  }))
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_tenants")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) {
    console.error("Error fetching tenant:", error)
    return null
  }

  return {
    id: data.id,
    name: data.name,
    type: data.type as Tenant["type"],
    color: data.color,
    active: data.active ?? true,
    created_at: data.created_at ?? new Date().toISOString(),
    updated_at: data.updated_at ?? new Date().toISOString(),
  }
}

export type TenantWithStats = Tenant & {
  activeTasks: number
  overdueTasks: number
  openLeads: number
  lastActivityAt: string | null
}

export async function getTenantsWithStats(): Promise<TenantWithStats[]> {
  const supabase = await createClient()

  // Fetch all tenants
  const { data: tenants, error: tenantsError } = await supabase
    .from("byred_tenants")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true })

  if (tenantsError || !tenants) {
    console.error("Error fetching tenants:", tenantsError)
    return []
  }

  // Fetch tasks and leads counts for all tenants
  const [{ data: tasks }, { data: leads }, { data: activities }] = await Promise.all([
    supabase.from("byred_tasks").select("id, tenant_id, status"),
    supabase.from("byred_leads").select("id, tenant_id, stage"),
    supabase.from("byred_activities").select("tenant_id, created_at").order("created_at", { ascending: false }),
  ])

  return tenants.map((tenant) => {
    const tenantTasks = (tasks ?? []).filter((t) => t.tenant_id === tenant.id)
    const tenantLeads = (leads ?? []).filter((l) => l.tenant_id === tenant.id)
    const tenantActivities = (activities ?? []).filter((a) => a.tenant_id === tenant.id)

    return {
      id: tenant.id,
      name: tenant.name,
      type: tenant.type as Tenant["type"],
      color: tenant.color,
      active: tenant.active ?? true,
      created_at: tenant.created_at ?? new Date().toISOString(),
      updated_at: tenant.updated_at ?? new Date().toISOString(),
      activeTasks: tenantTasks.filter((t) => t.status !== "done" && t.status !== "cancelled").length,
      overdueTasks: tenantTasks.filter((t) => t.status === "overdue").length,
      openLeads: tenantLeads.filter((l) => !["WON", "LOST"].includes(l.stage)).length,
      lastActivityAt: tenantActivities[0]?.created_at ?? null,
    }
  })
}
