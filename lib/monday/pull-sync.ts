import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { mondayBoardId } from "@/lib/monday/board-id"
import { fetchMondayItemNamesByIds } from "@/lib/monday/items"

export type MondayPullSyncResult = {
  boardId: string
  linkedTasks: number
  updated: number
  skipped: number
}

/**
 * For every `byred_tasks` row with `monday_item_id`, pull the current item **name**
 * from Monday and update the task **title** when it differs (Monday → By Red).
 */
export async function pullMondayTitlesIntoTasks(): Promise<MondayPullSyncResult> {
  const admin = createAdminClient()
  const boardId = mondayBoardId()

  const { data: rows, error } = await admin
    .from("byred_tasks")
    .select("id, title, monday_item_id")
    .not("monday_item_id", "is", null)

  if (error) {
    throw new Error(error.message)
  }

  const tasks = (rows ?? []) as Array<{
    id: string
    title: string
    monday_item_id: string | null
  }>

  const ids = tasks
    .map((t) => t.monday_item_id)
    .filter((id): id is string => id != null && id !== "")

  if (ids.length === 0) {
    return {
      boardId,
      linkedTasks: 0,
      updated: 0,
      skipped: 0,
    }
  }

  const names = await fetchMondayItemNamesByIds(ids)
  let updated = 0
  let skipped = 0
  const now = new Date().toISOString()

  for (const t of tasks) {
    const mid = t.monday_item_id
    if (!mid) continue
    const mondayName = names.get(String(mid))
    if (mondayName == null) {
      skipped++
      continue
    }
    if (mondayName.trim() === t.title.trim()) {
      skipped++
      continue
    }

    const { error: upErr } = await admin
      .from("byred_tasks")
      .update({
        title: mondayName.trim(),
        updated_at: now,
      } as never)
      .eq("id", t.id)

    if (!upErr) {
      updated++
    } else {
      skipped++
    }
  }

  return {
    boardId,
    linkedTasks: tasks.length,
    updated,
    skipped,
  }
}
