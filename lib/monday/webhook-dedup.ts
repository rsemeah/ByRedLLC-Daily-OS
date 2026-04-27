import "server-only"

import { createHash } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"

type SupabaseAdmin = ReturnType<typeof createAdminClient>

/**
 * Build a stable dedup key for a Monday webhook payload.
 *
 * Preference order:
 *   1. `event.id` if Monday supplied one (rare in practice)
 *   2. Composite of `(boardId?, pulseId, columnId?, event type, updated_at?)`
 *      — the natural key for "this specific state change on this item".
 *   3. Hash of the raw payload as a last resort.
 */
export function buildEventKey(body: Record<string, unknown>): string {
  const ev = (body.event as Record<string, unknown> | undefined) ?? {}
  const eid = ev.id ?? body.id
  if (typeof eid === "string" && eid.trim()) return `event:${eid.trim()}`

  const pulseId = ev.pulseId ?? ev.itemId ?? body.pulseId ?? body.itemId
  const boardId = ev.boardId ?? ev.board_id ?? body.boardId ?? body.board_id
  const columnId = ev.columnId
  const type = ev.type
  const updatedAt = ev.updatedAt ?? ev.changedAt

  const parts = [
    `b:${String(boardId ?? "")}`,
    `p:${String(pulseId ?? "")}`,
    `c:${String(columnId ?? "")}`,
    `t:${String(type ?? "")}`,
    `u:${String(updatedAt ?? "")}`,
  ]
  const composite = parts.join("|")

  if ([boardId, pulseId, columnId, type, updatedAt].some((value) => value != null && String(value).trim())) {
    return `composite:${composite}`
  }

  const hash = createHash("sha256")
    .update(JSON.stringify(body))
    .digest("hex")
  return `hash:${hash}`
}

export type DedupOutcome =
  | { duplicate: false; eventKey: string }
  | { duplicate: true; eventKey: string; previousResult: unknown }

/**
 * Insert-if-not-exists on (source, event_key). Returns whether we've seen
 * this event before and, if so, the previously-recorded result. Callers
 * should short-circuit processing on a duplicate.
 */
export async function recordWebhookEvent(opts: {
  source: "monday"
  payload: Record<string, unknown>
  admin?: SupabaseAdmin
}): Promise<DedupOutcome> {
  const admin = opts.admin ?? createAdminClient()
  const eventKey = buildEventKey(opts.payload)

  const { error } = await admin
    .from("byred_webhook_events")
    .insert({
      source: opts.source,
      event_key: eventKey,
      payload: opts.payload as never,
    } as never)

  if (!error) return { duplicate: false, eventKey }

  // 23505 = unique_violation. Anything else: surface the error.
  if (!String(error.code ?? "").includes("23505")) {
    throw new Error(`webhook_dedup insert failed: ${error.message}`)
  }

  const { data } = await admin
    .from("byred_webhook_events")
    .select("result")
    .eq("source", opts.source)
    .eq("event_key", eventKey)
    .maybeSingle()

  return {
    duplicate: true,
    eventKey,
    previousResult: (data as { result: unknown } | null)?.result ?? null,
  }
}

export async function annotateWebhookEvent(opts: {
  source: "monday"
  eventKey: string
  result: unknown
  admin?: SupabaseAdmin
}): Promise<void> {
  const admin = opts.admin ?? createAdminClient()
  await admin
    .from("byred_webhook_events")
    .update({ result: opts.result as never } as never)
    .eq("source", opts.source)
    .eq("event_key", opts.eventKey)
}
