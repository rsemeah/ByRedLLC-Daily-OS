import { createClient } from "@/lib/supabase/server"
import { assertTenantInScope, requireTenantScope } from "@/lib/data/tenant-scope"
import type { Lead } from "@/types/db"

function mapLeadRow(row: {
  id: string
  tenant_id: string
  name: string
  phone: string | null
  email: string | null
  source: string | null
  stage: string
  assigned_user_id: string | null
  last_contacted_at: string | null
  next_follow_up_at: string | null
  revenue_potential: number | null
  created_at: string | null
}): Lead {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    source: row.source,
    stage: row.stage as Lead["stage"],
    assigned_user_id: row.assigned_user_id,
    last_contacted_at: row.last_contacted_at,
    next_follow_up_at: row.next_follow_up_at,
    revenue_potential: row.revenue_potential,
    created_at: row.created_at ?? new Date().toISOString(),
  }
}

export async function getLeads(): Promise<Lead[]> {
  const { tenantIds } = await requireTenantScope()
  if (tenantIds.length === 0) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_leads")
    .select("*")
    .in("tenant_id", tenantIds)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching leads:", error)
    return []
  }

  return data.map(mapLeadRow)
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const { tenantIds } = await requireTenantScope()
  if (tenantIds.length === 0) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_leads")
    .select("*")
    .eq("id", id)
    .in("tenant_id", tenantIds)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error("Error fetching lead:", error)
    return null
  }

  return mapLeadRow(data)
}

export async function getLeadsByTenant(tenantId: string): Promise<Lead[]> {
  const { tenantIds } = await requireTenantScope()
  if (!assertTenantInScope(tenantId, tenantIds)) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_leads")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching leads:", error)
    return []
  }

  return data.map(mapLeadRow)
}
