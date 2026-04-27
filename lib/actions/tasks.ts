"use server"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import type { AiMode, TaskPriority, TaskStatus } from "@/types/db"
import type { ActionResult } from "@/lib/actions/mutation-types"
import { requireTenantAccess } from "@/lib/actions/tenant-guard"

type TaskInsert = Database["public"]["Tables"]["byred_tasks"]["Insert"]
type TaskUpdate = Database["public"]["Tables"]["byred_tasks"]["Update"]

export async function createTaskAction(input: {
  tenantId: string
  title: string
  description?: string | null
  dueDate?: string | null
  priority?: TaskPriority
  estimatedMinutes?: number | null
}): Promise<{ ok: true; data: { id: string } } | { ok: false; error: string }> {
  try {
    const { profileId } = await requireTenantAccess(input.tenantId)
    const supabase = await createClient()

    const title = input.title.trim()
    if (!title) {
      return { ok: false, error: "Title is required." }
    }

    const row: TaskInsert = {
      tenant_id: input.tenantId,
      title,
      description: input.description?.trim() || null,
      due_date: input.dueDate?.trim() || null,
      status: "not_started",
      priority: input.priority ?? "medium",
      estimated_minutes:
        input.estimatedMinutes != null && !Number.isNaN(input.estimatedMinutes)
          ? Math.max(1, Math.round(input.estimatedMinutes))
          : 30,
      ai_mode: "HUMAN_ONLY",
      blocker_flag: false,
      blocker_reason: null,
      blocked_by_task_id: null,
      owner_user_id: profileId,
      created_by_user_id: profileId,
      revenue_impact_score: 5,
      urgency_score: 5,
      monday_item_id: null,
    }

    // Supabase-js@newer pins PostgrestVersion "14.1" and collapses the
    // Insert/Update generic to `never`, so a real TaskInsert value still
    // fails to typecheck. Known upstream issue — cast through `never` once
    // here, the shape above is the source of truth and is exercised by
    // the runtime / DB constraints.
    const { data, error } = await supabase
      .from("byred_tasks")
      .insert(row as TaskInsert as never)
      .select("id")
      .single()

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Failed to create task." }
    }

    return { ok: true, data: { id: (data as { id: string }).id } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create task." }
  }
}

export async function updateTaskFieldsAction(input: {
  taskId: string
  tenantId: string
  title?: string
  status?: TaskStatus
  priority?: TaskPriority
  ai_mode?: AiMode
  blocker_flag?: boolean
  blocker_reason?: string | null
  due_date?: string | null
  description?: string | null
  estimated_minutes?: number | null
}): Promise<ActionResult> {
  try {
    await requireTenantAccess(input.tenantId)
    const supabase = await createClient()

    const patch: TaskUpdate = {
      updated_at: new Date().toISOString(),
    }

    if (input.title !== undefined) {
      const title = input.title.trim()
      if (!title) {
        return { ok: false, error: "Title is required." }
      }
      patch.title = title
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
    if (input.due_date !== undefined) {
      patch.due_date = input.due_date
    }
    if (input.description !== undefined) {
      const d = input.description
      patch.description = d == null ? null : d.trim() || null
    }
    if (input.estimated_minutes !== undefined) {
      patch.estimated_minutes =
        input.estimated_minutes == null || Number.isNaN(input.estimated_minutes)
          ? null
          : Math.max(1, Math.round(input.estimated_minutes))
    }

    if (input.blocker_flag === false) {
      patch.blocker_reason = null
    }

    const { data: updated, error } = await supabase
      .from("byred_tasks")
      .update(patch as TaskUpdate as never)
      .eq("id", input.taskId)
      .eq("tenant_id", input.tenantId)
      .select("id")
      .maybeSingle()

    if (error || !updated) {
      return {
        ok: false,
        error: error?.message ?? "Task not found in this workspace.",
      }
    }

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed." }
  }
}
