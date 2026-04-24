import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getTasks, getTasksByTenant } from "@/lib/data/tasks"
import { requireTenantScope } from "@/lib/data/tenant-scope"
import { TasksList } from "@/components/byred/tasks-list"
import { BoardTabs, type BoardTabEntry } from "@/components/byred/board-tabs"

type SearchParams = Promise<{ tenant_id?: string }>

type TenantRow = {
  id: string
  name: string
  monday_board_id: string | null
}

async function loadBoardTabs(): Promise<BoardTabEntry[]> {
  const { tenantIds } = await requireTenantScope()
  if (tenantIds.length === 0) return []

  const supabase = await createClient()

  const [{ data: tenants }, { data: taskRows }] = await Promise.all([
    supabase
      .from("byred_tenants")
      .select("id, name, monday_board_id")
      .in("id", tenantIds)
      .not("monday_board_id", "is", null)
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase
      .from("byred_tasks")
      .select("tenant_id")
      .in("tenant_id", tenantIds)
      .is("archived_at", null),
  ])

  const tenantRows = (tenants ?? []) as TenantRow[]
  const countByTenant = new Map<string, number>()
  for (const r of (taskRows ?? []) as Array<{ tenant_id: string }>) {
    countByTenant.set(r.tenant_id, (countByTenant.get(r.tenant_id) ?? 0) + 1)
  }

  return tenantRows
    .filter((t) => t.monday_board_id?.trim())
    .map((t) => ({
      tenantId: t.id,
      tenantName: t.name,
      boardId: t.monday_board_id!.trim(),
      count: countByTenant.get(t.id) ?? 0,
    }))
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const selectedTenantId = params.tenant_id?.trim() || null

  const { tenantIds } = await requireTenantScope()
  if (selectedTenantId && !tenantIds.includes(selectedTenantId)) {
    notFound()
  }

  const [tabs, tasks] = await Promise.all([
    loadBoardTabs(),
    selectedTenantId ? getTasksByTenant(selectedTenantId) : getTasks(),
  ])

  const totalCount = tabs.reduce((acc, t) => acc + t.count, 0)

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <BoardTabs
        tabs={tabs}
        activeTenantId={selectedTenantId}
        totalCount={totalCount}
      />
      <TasksList initialTasks={tasks} lockedTenantId={selectedTenantId} />
    </div>
  )
}
