"use server"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import type { AiMode, TaskPriority, TaskStatus } from "@/types/db"
import type { ActionResult } from "@/lib/actions/mutation-types"
import { requireTenantAccess } from "@/lib/actions/tenant-guard"

type TaskUpdate = Database["public"]["Tables"]["byred_tasks"]["Update"]

export async function updateTaskFieldsAction(input: {
  taskId: string
  tenantId: string
  title?: string
  status?: TaskStatus
  priority?: TaskPriority
  ai_mode?: AiMode
  blocker_flag?: boolean
  blocker_reason?: string | null
}): Promise<ActionResult> {
  try {
    await requireTenantAccess(input.tenantId)
    const supabase = await createClient()

    const patch: TaskUpdate = {
      updated_at: new Date().toISOString(),
    }

    if (input.title !== undefined) {
      patch.title = input.title.trim()
    }
    if (input.status !== undefined) {
      patch.status = input.status
    }
    if (input.priority !== undefined) {
      patch.priority = input.priority
    }
    if (input.ai_mode !== undefined) {
      patch.ai_mode = input.ai_mode
    }
    if (input.blocker_flag !== undefined) {
      patch.blocker_flag = input.blocker_flag
    }
    if (input.blocker_reason !== undefined) {
      patch.blocker_reason = input.blocker_reason
    }

    if (input.blocker_flag === false) {
      patch.blocker_reason = null
    }

    const { error } = await supabase
      .from("byred_tasks")
      .update(patch as never)
      .eq("id", input.taskId)
      .eq("tenant_id", input.tenantId)

    if (error) {
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed." }
  }
}
