import { createClient } from "@/lib/supabase/server"
import type { Lead } from "@/types/db"

export async function getLeads(): Promise<Lead[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_leads")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching leads:", error)
    return []
  }

  return data.map((row) => ({
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
  }))
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_leads")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) {
    console.error("Error fetching lead:", error)
    return null
  }

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    source: data.source,
    stage: data.stage as Lead["stage"],
    assigned_user_id: data.assigned_user_id,
    last_contacted_at: data.last_contacted_at,
    next_follow_up_at: data.next_follow_up_at,
    revenue_potential: data.revenue_potential,
    created_at: data.created_at ?? new Date().toISOString(),
  }
}

export async function getLeadsByTenant(tenantId: string): Promise<Lead[]> {
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

  return data.map((row) => ({
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
  }))
}
