import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { fetchMondayItemNamesByIds } from "@/lib/monday/items"
import { mondaySyncTenantId } from "@/lib/monday/sync-tenant"

function extractPulseId(body: Record<string, unknown>): string | null {
  const rootPulse = body.pulseId ?? body.itemId ?? body.pulse_id
  if (typeof rootPulse === "number") return String(rootPulse)
  if (typeof rootPulse === "string" && rootPulse.trim()) return rootPulse.trim()

  const ev = body.event
  if (ev && typeof ev === "object") {
    const e = ev as Record<string, unknown>
    const p = e.pulseId ?? e.itemId ?? e.pulse_id ?? e.item_id
    if (typeof p === "number") return String(p)
    if (typeof p === "string" && p.trim()) return p.trim()
  }

  return null
}

export type MondayWebhookResult = {
  pulseId: string | null
  action: "updated" | "inserted" | "skipped"
  updated: boolean
  reason?: string
}

/**
 * Apply a Monday webhook event: resolve the pulse id, upsert into `byred_tasks`.
 * - Existing linked task → update title if changed.
 * - Unknown Monday item + `MONDAY_SYNC_TENANT_ID` set → insert new task.
 * - Unknown item + tenant unset → skip (no orphan rows).
 * Requires `MONDAY_API_KEY` for item name lookup.
 */
export async function processMondayWebhookPayload(
  body: Record<string, unknown>
): Promise<MondayWebhookResult> {
  const tokenPresent =
    (process.env.MONDAY_API_KEY?.trim() ?? "") !== "" ||
    (process.env.MONDAY_TOKEN?.trim() ?? "") !== ""

  if (!tokenPresent) {
    return {
      pulseId: extractPulseId(body),
      action: "skipped",
      updated: false,
      reason: "MONDAY_API_KEY not configured; webhook accepted but no sync.",
    }
  }

  const pulseId = extractPulseId(body)
  if (!pulseId) {
    return { pulseId: null, action: "skipped", updated: false, reason: "No pulse/item id in payload." }
  }

  const names = await fetchMondayItemNamesByIds([pulseId])
  const name = names.get(pulseId)
  if (!name) {
    return {
      pulseId,
      action: "skipped",
      updated: false,
      reason: "Item not found in Monday or API error.",
    }
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data: rows, error: findErr } = await admin
    .from("byred_tasks")
    .select("id, title")
    .eq("monday_item_id", pulseId)
    .limit(2)

  if (findErr) {
    return { pulseId, action: "skipped", updated: false, reason: findErr.message }
  }

  const hit = rows?.[0] as { id: string; title: string } | undefined
  const cleanName = name.trim()

  if (hit) {
    if (hit.title.trim() === cleanName) {
      return { pulseId, action: "skipped", updated: false, reason: "Title already matches Monday." }
    }

    const { error: upErr } = await admin
      .from("byred_tasks")
      .update({ title: cleanName, updated_at: now } as never)
      .eq("id", hit.id)

    if (upErr) {
      return { pulseId, action: "skipped", updated: false, reason: upErr.message }
    }
    return { pulseId, action: "updated", updated: true }
  }

  const tenantId = mondaySyncTenantId()
  if (!tenantId) {
    return {
      pulseId,
      action: "skipped",
      updated: false,
      reason: "No By Red task linked and MONDAY_SYNC_TENANT_ID unset; refusing to insert.",
    }
  }

  const { error: insErr } = await admin
    .from("byred_tasks")
    .insert({
      tenant_id: tenantId,
      title: cleanName,
      monday_item_id: pulseId,
    } as never)

  if (insErr) {
    return { pulseId, action: "skipped", updated: false, reason: insErr.message }
  }
  return { pulseId, action: "inserted", updated: true }
}
