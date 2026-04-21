import { createClient } from "@/lib/supabase/server"
import { assertTenantInScope, requireTenantScope } from "@/lib/data/tenant-scope"
import type { ByredTenant, Tenant } from "@/types/db"

type TenantTaskAggRow = { id: string; tenant_id: string; status: string }
type TenantLeadAggRow = { id: string; tenant_id: string; stage: string }
type TenantActivityAggRow = { tenant_id: string; created_at: string | null }

function mapTenantRow(row: {
  id: string
  name: string
  type: string
  color: string | null
  active: boolean | null
  created_at: string | null
  updated_at: string | null
}): Tenant {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Tenant["type"],
    color: row.color ?? "#d90009",
    active: row.active ?? true,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
  }
}

export async function getTenants(): Promise<Tenant[]> {
  const { tenantIds } = await requireTenantScope()
  if (tenantIds.length === 0) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_tenants")
    .select("*")
    .eq("active", true)
    .in("id", tenantIds)
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching tenants:", error)
    return []
  }

  return data.map(mapTenantRow)
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const { tenantIds } = await requireTenantScope()
  if (tenantIds.length === 0 || !assertTenantInScope(id, tenantIds)) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_tenants")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error("Error fetching tenant:", error)
    return null
  }

  return mapTenantRow(data)
}

export type TenantWithStats = Tenant & {
  activeTasks: number
  overdueTasks: number
  openLeads: number
  lastActivityAt: string | null
}

export async function getTenantsWithStats(): Promise<TenantWithStats[]> {
  const { tenantIds } = await requireTenantScope()
  if (tenantIds.length === 0) return []

  const supabase = await createClient()

  const { data: tenants, error: tenantsError } = await supabase
    .from("byred_tenants")
    .select("*")
    .eq("active", true)
    .in("id", tenantIds)
    .order("name", { ascending: true })

  if (tenantsError || !tenants) {
    console.error("Error fetching tenants:", tenantsError)
    return []
  }

  const tenantRows = tenants as ByredTenant[]

  const [{ data: tasks }, { data: leads }, { data: activities }] = await Promise.all([
    supabase.from("byred_tasks").select("id, tenant_id, status").in("tenant_id", tenantIds),
    supabase.from("byred_leads").select("id, tenant_id, stage").in("tenant_id", tenantIds),
    supabase
      .from("byred_activities")
      .select("tenant_id, created_at")
      .in("tenant_id", tenantIds)
      .order("created_at", { ascending: false })
      .limit(500),
  ])

  const taskRows = (tasks ?? []) as TenantTaskAggRow[]
  const leadRows = (leads ?? []) as TenantLeadAggRow[]
  const activityRows = (activities ?? []) as TenantActivityAggRow[]

  return tenantRows.map((tenant) => {
    const tenantTasks = taskRows.filter((t) => t.tenant_id === tenant.id)
    const tenantLeads = leadRows.filter((l) => l.tenant_id === tenant.id)
    const tenantActivities = activityRows.filter((a) => a.tenant_id === tenant.id)

    return {
      ...mapTenantRow(tenant),
      activeTasks: tenantTasks.filter((t) => t.status !== "done" && t.status !== "cancelled").length,
      overdueTasks: tenantTasks.filter((t) => t.status === "overdue").length,
      openLeads: tenantLeads.filter((l) => !["WON", "LOST"].includes(l.stage)).length,
      lastActivityAt: tenantActivities[0]?.created_at ?? null,
    }
  })
}
