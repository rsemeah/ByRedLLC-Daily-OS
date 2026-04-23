import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import {
  getBoundTenantBoards,
  mondayBoardId,
  type TenantBoardBinding,
} from "@/lib/monday/board-id"
import { fetchAllBoardItems, type MondayBoardItem } from "@/lib/monday/items"
import { mondaySyncTenantId } from "@/lib/monday/sync-tenant"

export type MondayPullSyncResult = {
  tenantId: string
  tenantName: string
  boardId: string
  boardItems: number
  linked: number
  inserted: number
  updated: number
  unchanged: number
  errors: number
}

export type MondayPullSyncBatch = {
  tenants: number
  totals: {
    boardItems: number
    linked: number
    inserted: number
    updated: number
    unchanged: number
    errors: number
  }
  results: MondayPullSyncResult[]
}

type SupabaseAdmin = ReturnType<typeof createAdminClient>

async function pullOneBoard(
  admin: SupabaseAdmin,
  binding: TenantBoardBinding
): Promise<MondayPullSyncResult> {
  const boardItems: MondayBoardItem[] = await fetchAllBoardItems(binding.boardId)

  const base: MondayPullSyncResult = {
    tenantId: binding.tenantId,
    tenantName: binding.tenantName,
    boardId: binding.boardId,
    boardItems: boardItems.length,
    linked: 0,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
  }

  if (boardItems.length === 0) return base

  const ids = boardItems.map((i) => String(i.id))

  const { data: existingRows, error: fetchErr } = await admin
    .from("byred_tasks")
    .select("id, title, monday_item_id, tenant_id")
    .in("monday_item_id", ids)

  if (fetchErr) throw new Error(`tasks lookup: ${fetchErr.message}`)

  const existing = new Map<
    string,
    { id: string; title: string; tenant_id: string }
  >()
  for (const r of (existingRows ?? []) as Array<{
    id: string
    title: string
    monday_item_id: string | null
    tenant_id: string
  }>) {
    if (r.monday_item_id) {
      existing.set(String(r.monday_item_id), {
        id: r.id,
        title: r.title,
        tenant_id: r.tenant_id,
      })
    }
  }
  base.linked = existing.size

  const now = new Date().toISOString()

  for (const item of boardItems) {
    const mondayId = String(item.id)
    const cleanName = item.name.trim() || "(untitled)"
    const hit = existing.get(mondayId)

    if (hit) {
      if (hit.title.trim() === cleanName && hit.tenant_id === binding.tenantId) {
        base.unchanged += 1
        continue
      }
      const { error: upErr } = await admin
        .from("byred_tasks")
        .update({
          title: cleanName,
          tenant_id: binding.tenantId,
          updated_at: now,
        } as never)
        .eq("id", hit.id)
      if (upErr) base.errors += 1
      else base.updated += 1
      continue
    }

    const { error: insErr } = await admin.from("byred_tasks").insert({
      tenant_id: binding.tenantId,
      title: cleanName,
      monday_item_id: mondayId,
    } as never)

    if (insErr) base.errors += 1
    else base.inserted += 1
  }

  return base
}

/**
 * Full multi-tenant Monday pull.
 * Iterates every tenant with a `monday_board_id`, pulls that board, reconciles
 * into `byred_tasks` scoped to the owning tenant. One Monday board → one tenant.
 *
 * Idempotent via the `byred_tasks_monday_item_id_unique` partial index.
 */
export async function pullAllMondayBoardsIntoTasks(): Promise<MondayPullSyncBatch> {
  const admin = createAdminClient()
  const bindings = await getBoundTenantBoards({ activeOnly: true })

  // Legacy fallback: no per-tenant bindings yet — pull the env board into the
  // legacy sync tenant, preserving pre-migration behavior.
  if (bindings.length === 0) {
    const legacyTenantId = mondaySyncTenantId()
    const legacyBoardId = mondayBoardId()
    if (!legacyTenantId) {
      return {
        tenants: 0,
        totals: {
          boardItems: 0,
          linked: 0,
          inserted: 0,
          updated: 0,
          unchanged: 0,
          errors: 0,
        },
        results: [],
      }
    }
    const res = await pullOneBoard(admin, {
      tenantId: legacyTenantId,
      tenantName: "(legacy env tenant)",
      boardId: legacyBoardId,
      groupId: null,
      active: true,
    })
    return {
      tenants: 1,
      totals: {
        boardItems: res.boardItems,
        linked: res.linked,
        inserted: res.inserted,
        updated: res.updated,
        unchanged: res.unchanged,
        errors: res.errors,
      },
      results: [res],
    }
  }

  const results: MondayPullSyncResult[] = []
  for (const b of bindings) {
    try {
      const r = await pullOneBoard(admin, b)
      results.push(r)
    } catch (e) {
      results.push({
        tenantId: b.tenantId,
        tenantName: b.tenantName,
        boardId: b.boardId,
        boardItems: 0,
        linked: 0,
        inserted: 0,
        updated: 0,
        unchanged: 0,
        errors: 1,
      })
      console.error(
        JSON.stringify({
          event: "monday_pull.tenant_failed",
          tenant_id: b.tenantId,
          board_id: b.boardId,
          error: e instanceof Error ? e.message : String(e),
        })
      )
    }
  }

  const totals = results.reduce(
    (acc, r) => ({
      boardItems: acc.boardItems + r.boardItems,
      linked: acc.linked + r.linked,
      inserted: acc.inserted + r.inserted,
      updated: acc.updated + r.updated,
      unchanged: acc.unchanged + r.unchanged,
      errors: acc.errors + r.errors,
    }),
    { boardItems: 0, linked: 0, inserted: 0, updated: 0, unchanged: 0, errors: 0 }
  )

  return { tenants: results.length, totals, results }
}

