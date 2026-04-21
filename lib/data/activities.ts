import { createClient } from "@/lib/supabase/server"
import { assertTenantInScope, requireTenantScope } from "@/lib/data/tenant-scope"
import type { Activity } from "@/types/db"

export type ActivityRow = {
  id: string
  tenant_id: string
  object_type: string
  object_id: string
  user_id: string | null
  type: string
  summary: string
  metadata: unknown
  created_at: string
}

function mapActivityFromDb(row: ActivityRow): Activity {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    object_type: row.object_type as "task" | "lead",
    object_id: row.object_id,
    user_id: row.user_id,
    type: row.type,
    summary: row.summary,
    created_at: row.created_at ?? new Date().toISOString(),
  }
}

export async function getActivities(): Promise<Activity[]> {
  const { tenantIds } = await requireTenantScope()
  if (tenantIds.length === 0) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_activities")
    .select("*")
    .in("tenant_id", tenantIds)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    console.error("Error fetching activities:", error)
    return []
  }

  return data.map(mapActivityFromDb)
}

export async function getActivitiesForObject(
  objectType: "task" | "lead",
  objectId: string
): Promise<Activity[]> {
  const { tenantIds } = await requireTenantScope()
  if (tenantIds.length === 0) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_activities")
    .select("*")
    .eq("object_type", objectType)
    .eq("object_id", objectId)
    .in("tenant_id", tenantIds)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching activities:", error)
    return []
  }

  return data.map(mapActivityFromDb)
}

export async function getActivitiesByTenant(tenantId: string): Promise<Activity[]> {
  const { tenantIds } = await requireTenantScope()
  if (!assertTenantInScope(tenantId, tenantIds)) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_activities")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("Error fetching activities:", error)
    return []
  }

  return data.map(mapActivityFromDb)
}
