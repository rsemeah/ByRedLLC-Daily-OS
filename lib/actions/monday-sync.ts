"use server"

import { createClient } from "@/lib/supabase/server"
import { createMondayItemForTask } from "@/lib/monday/sync-task"
import { requireTenantAccess } from "@/lib/actions/tenant-guard"
import type { ActionResult } from "@/lib/actions/mutation-types"

/**
 * Creates a Monday.com item for this task and stores `monday_item_id` (one-way push).
 */
export async function syncTaskToMondayAction(input: {
  taskId: string
  tenantId: string
}): Promise<ActionResult<{ mondayItemId: string }>> {
  try {
    await requireTenantAccess(input.tenantId)
    const supabase = await createClient()

    const { data: row, error: fetchErr } = await supabase
      .from("byred_tasks")
      .select("id, title, monday_item_id, tenant_id")
      .eq("id", input.taskId)
      .eq("tenant_id", input.tenantId)
      .maybeSingle()

    if (fetchErr || !row) {
      return { ok: false, error: fetchErr?.message ?? "Task not found." }
    }

    const task = row as {
      id: string
      title: string
      monday_item_id: string | null
      tenant_id: string
    }

    if (task.monday_item_id) {
      return {
        ok: true,
        data: { mondayItemId: task.monday_item_id },
      }
    }

    const mondayId = await createMondayItemForTask(task.title, task.tenant_id)

    const { error: updateErr } = await supabase
      .from("byred_tasks")
      .update({
        monday_item_id: mondayId,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", task.id)
      .eq("tenant_id", task.tenant_id)

    if (updateErr) {
      return { ok: false, error: updateErr.message }
    }

    return { ok: true, data: { mondayItemId: mondayId } }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Monday sync failed.",
    }
  }
}
