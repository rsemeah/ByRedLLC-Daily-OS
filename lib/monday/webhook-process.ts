import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { fetchMondayItemNamesByIds } from "@/lib/monday/items"

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

/**
 * Applies a Monday webhook payload: resolve affected pulse id and sync title into `byred_tasks`.
 * Requires `MONDAY_API_KEY` for GraphQL item lookup.
 */
export async function processMondayWebhookPayload(
  body: Record<string, unknown>
): Promise<{ pulseId: string | null; updated: boolean; reason?: string }> {
  if (
    process.env.MONDAY_API_KEY?.trim() === undefined &&
    process.env.MONDAY_TOKEN?.trim() === undefined
  ) {
    return {
      pulseId: extractPulseId(body),
      updated: false,
      reason: "MONDAY_API_KEY not configured; webhook accepted but no sync.",
    }
  }

  const pulseId = extractPulseId(body)
  if (!pulseId) {
    return { pulseId: null, updated: false, reason: "No pulse/item id in payload." }
  }

  const names = await fetchMondayItemNamesByIds([pulseId])
  const name = names.get(pulseId)
  if (!name) {
    return {
      pulseId,
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
    return { pulseId, updated: false, reason: findErr.message }
  }

  const hit = rows?.[0] as { id: string; title: string } | undefined
  if (!hit) {
    return {
      pulseId,
      updated: false,
      reason: "No By Red task linked to this Monday item.",
    }
  }

  if (hit.title.trim() === name.trim()) {
    return { pulseId, updated: false, reason: "Title already matches Monday." }
  }

  const { error: upErr } = await admin
    .from("byred_tasks")
    .update({
      title: name.trim(),
      updated_at: now,
    } as never)
    .eq("id", hit.id)

  if (upErr) {
    return { pulseId, updated: false, reason: upErr.message }
  }

  return { pulseId, updated: true }
}
