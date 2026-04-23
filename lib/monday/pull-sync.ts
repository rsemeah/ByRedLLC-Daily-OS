import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { mondayBoardId } from "@/lib/monday/board-id"
import { fetchAllBoardItems, type MondayBoardItem } from "@/lib/monday/items"
import { mondaySyncTenantId } from "@/lib/monday/sync-tenant"

export type MondayPullSyncResult = {
  boardId: string
  boardItems: number
  linked: number
  inserted: number
  updated: number
  skippedNoTenant: number
  unchanged: number
  errors: number
}

/**
 * True board pull. Fetches every item on the configured Monday board and
 * reconciles against `byred_tasks`:
 *   - linked (match on `monday_item_id`) + title changed → UPDATE
 *   - linked + title matches                              → unchanged
 *   - unlinked + `MONDAY_SYNC_TENANT_ID` set              → INSERT new task
 *   - unlinked + tenant unset                             → skip (counted)
 *
 * Idempotent: relies on the partial UNIQUE index
 * `byred_tasks_monday_item_id_unique` from migration 20260422180000.
 */
export async function pullMondayBoardIntoTasks(): Promise<MondayPullSyncResult> {
  const admin = createAdminClient()
  const boardId = mondayBoardId()
  const tenantId = mondaySyncTenantId()

  const boardItems: MondayBoardItem[] = await fetchAllBoardItems(boardId)

  if (boardItems.length === 0) {
    return {
      boardId,
      boardItems: 0,
      linked: 0,
      inserted: 0,
      updated: 0,
      skippedNoTenant: 0,
      unchanged: 0,
      errors: 0,
    }
  }

  const ids = boardItems.map((i) => String(i.id))

  const { data: existingRows, error: fetchErr } = await admin
    .from("byred_tasks")
    .select("id, title, monday_item_id")
    .in("monday_item_id", ids)

  if (fetchErr) {
    throw new Error(fetchErr.message)
  }

  const existing = new Map<string, { id: string; title: string }>()
  for (const r of (existingRows ?? []) as Array<{
    id: string
    title: string
    monday_item_id: string | null
  }>) {
    if (r.monday_item_id) {
      existing.set(String(r.monday_item_id), { id: r.id, title: r.title })
    }
  }

  const now = new Date().toISOString()
  let inserted = 0
  let updated = 0
  let skippedNoTenant = 0
  let unchanged = 0
  let errors = 0

  for (const item of boardItems) {
    const mondayId = String(item.id)
    const cleanName = item.name.trim() || "(untitled)"
    const hit = existing.get(mondayId)

    if (hit) {
      if (hit.title.trim() === cleanName) {
        unchanged += 1
        continue
      }
      const { error: upErr } = await admin
        .from("byred_tasks")
        .update({ title: cleanName, updated_at: now } as never)
        .eq("id", hit.id)
      if (upErr) {
        errors += 1
      } else {
        updated += 1
      }
      continue
    }

    if (!tenantId) {
      skippedNoTenant += 1
      continue
    }

    const { error: insErr } = await admin
      .from("byred_tasks")
      .insert({
        tenant_id: tenantId,
        title: cleanName,
        monday_item_id: mondayId,
      } as never)

    if (insErr) {
      errors += 1
    } else {
      inserted += 1
    }
  }

  return {
    boardId,
    boardItems: boardItems.length,
    linked: existing.size,
    inserted,
    updated,
    skippedNoTenant,
    unchanged,
    errors,
  }
}
