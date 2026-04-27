"use server"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import type { LeadStage } from "@/types/db"
import { insertActivityRow } from "@/lib/actions/activity-log"
import type { ActionResult } from "@/lib/actions/mutation-types"
import { requireTenantAccess } from "@/lib/actions/tenant-guard"

type LeadInsert = Database["public"]["Tables"]["byred_leads"]["Insert"]
type LeadUpdate = Database["public"]["Tables"]["byred_leads"]["Update"]
type TaskInsert = Database["public"]["Tables"]["byred_tasks"]["Insert"]

async function findLeadInTenant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  leadId: string,
  tenantId: string
): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase
    .from("byred_leads")
    .select("id, name")
    .eq("id", leadId)
    .eq("tenant_id", tenantId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as { id: string; name: string } | null) ?? null
}

export async function createLeadAction(input: {
  tenantId: string
  name: string
  phone?: string
  email?: string
  source?: string
  revenuePotential?: number | null
  notes?: string
}): Promise<
  { ok: true; data: { id: string } } | { ok: false; error: string }
> {
  try {
    const { profileId } = await requireTenantAccess(input.tenantId)
    const supabase = await createClient()
    const name = input.name.trim()

    if (!name) {
      return { ok: false, error: "Lead name is required." }
    }

    const row: LeadInsert = {
      tenant_id: input.tenantId,
      name,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      source: input.source?.trim() || null,
      revenue_potential:
        input.revenuePotential == null || Number.isNaN(input.revenuePotential)
          ? null
          : input.revenuePotential,
      notes: input.notes?.trim() || null,
      stage: "NEW",
      created_by_user_id: profileId,
      assigned_user_id: profileId,
    }

    const { data, error } = await supabase
      .from("byred_leads")
      .insert(row as never)
      .select("id")
      .single()

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Failed to create lead." }
    }

    const created = data as { id: string }
    return { ok: true, data: { id: created.id } }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create lead."
    return { ok: false, error: msg }
  }
}

export async function updateLeadStageAction(input: {
  leadId: string
  tenantId: string
  stage: LeadStage
  previousStage: LeadStage
}): Promise<ActionResult> {
  try {
    const { profileId } = await requireTenantAccess(input.tenantId)
    const supabase = await createClient()
    const now = new Date().toISOString()

    const patch: LeadUpdate = {
      stage: input.stage,
      updated_at: now,
    }

    const { data: updated, error: updErr } = await supabase
      .from("byred_leads")
      .update(patch as never)
      .eq("id", input.leadId)
      .eq("tenant_id", input.tenantId)
      .select("id")
      .maybeSingle()

    if (updErr || !updated) {
      return {
        ok: false,
        error: updErr?.message ?? "Lead not found in this workspace.",
      }
    }

    const { error: actErr } = await insertActivityRow({
      tenant_id: input.tenantId,
      object_type: "lead",
      object_id: input.leadId,
      user_id: profileId,
      type: "stage_change",
      summary: `${input.previousStage} → ${input.stage}`,
      metadata: null,
    })

    if (actErr) {
      return { ok: false, error: actErr.message }
    }

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed." }
  }
}

export async function logLeadContactNoteAction(input: {
  leadId: string
  tenantId: string
  note: string
}): Promise<ActionResult> {
  try {
    const { profileId } = await requireTenantAccess(input.tenantId)
    const summary = input.note.trim()
    if (!summary) {
      return { ok: false, error: "Note is empty." }
    }
    const supabase = await createClient()
    const lead = await findLeadInTenant(supabase, input.leadId, input.tenantId)
    if (!lead) {
      return { ok: false, error: "Lead not found in this workspace." }
    }

    const { error } = await insertActivityRow({
      tenant_id: input.tenantId,
      object_type: "lead",
      object_id: input.leadId,
      user_id: profileId,
      type: "note",
      summary,
      metadata: null,
    })

    if (error) {
      return { ok: false, error: error.message }
    }

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to log contact." }
  }
}

export async function markLeadContactedAction(input: {
  leadId: string
  tenantId: string
}): Promise<ActionResult> {
  try {
    await requireTenantAccess(input.tenantId)
    const supabase = await createClient()
    const now = new Date().toISOString()

    const patch: LeadUpdate = {
      last_contacted_at: now,
      updated_at: now,
    }

    const { data: updated, error } = await supabase
      .from("byred_leads")
      .update(patch as never)
      .eq("id", input.leadId)
      .eq("tenant_id", input.tenantId)
      .select("id")
      .maybeSingle()

    if (error || !updated) {
      return {
        ok: false,
        error: error?.message ?? "Lead not found in this workspace.",
      }
    }

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed." }
  }
}

export async function setLeadFollowUpAction(input: {
  leadId: string
  tenantId: string
  followUpAtIso: string
}): Promise<ActionResult> {
  try {
    await requireTenantAccess(input.tenantId)
    const supabase = await createClient()
    const now = new Date().toISOString()

    const patch: LeadUpdate = {
      next_follow_up_at: input.followUpAtIso,
      updated_at: now,
    }

    const { data: updated, error } = await supabase
      .from("byred_leads")
      .update(patch as never)
      .eq("id", input.leadId)
      .eq("tenant_id", input.tenantId)
      .select("id")
      .maybeSingle()

    if (error || !updated) {
      return {
        ok: false,
        error: error?.message ?? "Lead not found in this workspace.",
      }
    }

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed." }
  }
}

export async function archiveLeadAction(input: {
  leadId: string
  tenantId: string
  previousStage: LeadStage
}): Promise<ActionResult> {
  return updateLeadStageAction({
    leadId: input.leadId,
    tenantId: input.tenantId,
    stage: "LOST",
    previousStage: input.previousStage,
  })
}

export async function createTaskFromLeadAction(input: {
  leadId: string
  tenantId: string
  leadName: string
}): Promise<
  { ok: true; data: { taskId: string } } | { ok: false; error: string }
> {
  try {
    const { profileId } = await requireTenantAccess(input.tenantId)
    const supabase = await createClient()
    const lead = await findLeadInTenant(supabase, input.leadId, input.tenantId)
    if (!lead) {
      return { ok: false, error: "Lead not found in this workspace." }
    }

    const row: TaskInsert = {
      tenant_id: input.tenantId,
      title: `Follow up: ${lead.name}`,
      description: `Created from lead.\n\nLead ID: \`${input.leadId}\``,
      status: "not_started",
      priority: "medium",
      due_date: null,
      estimated_minutes: 30,
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

    const { data, error } = await supabase
      .from("byred_tasks")
      .insert(row as never)
      .select("id")
      .single()

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Failed to create task." }
    }

    const taskId = (data as { id: string }).id

    const { error: actErr } = await insertActivityRow({
      tenant_id: input.tenantId,
      object_type: "lead",
      object_id: input.leadId,
      user_id: profileId,
      type: "lead_link",
      summary: `Task created: ${taskId}`,
      metadata: null,
    })

    if (actErr) {
      return { ok: false, error: actErr.message }
    }

    return { ok: true, data: { taskId } }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create task." }
  }
}
