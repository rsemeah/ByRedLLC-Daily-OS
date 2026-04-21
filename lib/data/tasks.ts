import { createClient } from "@/lib/supabase/server"
import { assertTenantInScope, requireTenantScope } from "@/lib/data/tenant-scope"
import { mapTaskFromDb, type ByredTask, type Task } from "@/types/db"

type TaskStatRow = Pick<
  ByredTask,
  "id" | "priority" | "due_date" | "estimated_minutes" | "revenue_impact_score" | "status"
>

export async function getTasks(): Promise<Task[]> {
  const { tenantIds } = await requireTenantScope()
  if (tenantIds.length === 0) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_tasks")
    .select("*")
    .in("tenant_id", tenantIds)
    .order("revenue_impact_score", { ascending: false })
    .order("urgency_score", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching tasks:", error)
    return []
  }

  return data.map(mapTaskFromDb)
}

export async function getTaskById(id: string): Promise<Task | null> {
  const { tenantIds } = await requireTenantScope()
  if (tenantIds.length === 0) return null

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_tasks")
    .select("*")
    .eq("id", id)
    .in("tenant_id", tenantIds)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error("Error fetching task:", error)
    return null
  }

  return mapTaskFromDb(data)
}

export async function getTasksByTenant(tenantId: string): Promise<Task[]> {
  const { tenantIds } = await requireTenantScope()
  if (!assertTenantInScope(tenantId, tenantIds)) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_tasks")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("revenue_impact_score", { ascending: false })
    .order("urgency_score", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching tasks:", error)
    return []
  }

  return data.map(mapTaskFromDb)
}

export async function getTasksByStatus(status: string): Promise<Task[]> {
  const { tenantIds } = await requireTenantScope()
  if (tenantIds.length === 0) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("byred_tasks")
    .select("*")
    .eq("status", status)
    .in("tenant_id", tenantIds)
    .order("revenue_impact_score", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching tasks:", error)
    return []
  }

  return data.map(mapTaskFromDb)
}

export async function getTasksForToday(): Promise<Task[]> {
  const { tenantIds } = await requireTenantScope()
  if (tenantIds.length === 0) return []

  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  const { data, error } = await supabase
    .from("byred_tasks")
    .select("*")
    .in("tenant_id", tenantIds)
    .or(`due_date.lte.${today},status.eq.in_progress,status.eq.not_started`)
    .neq("status", "done")
    .neq("status", "cancelled")
    .order("priority", { ascending: true })
    .order("due_date", { ascending: true })

  if (error) {
    console.error("Error fetching today tasks:", error)
    return []
  }

  return data.map(mapTaskFromDb)
}

export async function getTaskStats() {
  const { tenantIds } = await requireTenantScope()
  if (tenantIds.length === 0) {
    return { criticalNow: 0, moneyMoves: 0, quickWins: 0, comingUp: 0 }
  }

  const supabase = await createClient()
  const today = new Date().toISOString().split("T")[0]

  const { data: tasks, error } = await supabase
    .from("byred_tasks")
    .select("id, priority, due_date, estimated_minutes, revenue_impact_score, status")
    .in("tenant_id", tenantIds)
    .neq("status", "done")
    .neq("status", "cancelled")

  if (error || !tasks) {
    console.error("Error fetching task stats:", error)
    return { criticalNow: 0, moneyMoves: 0, quickWins: 0, comingUp: 0 }
  }

  const scoped = tasks as TaskStatRow[]

  const criticalNow = scoped.filter(
    (t) => t.priority === "critical" && t.due_date && t.due_date <= today
  ).length

  const moneyMoves = scoped.filter((t) => (t.revenue_impact_score ?? 0) >= 7).length

  const quickWins = scoped.filter((t) => (t.estimated_minutes ?? 30) <= 30).length

  const comingUp = scoped.filter((t) => t.due_date && t.due_date > today).length

  return { criticalNow, moneyMoves, quickWins, comingUp }
}
