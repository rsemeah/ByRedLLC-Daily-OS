import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { fetchMondayItemsWithBoardByIds } from "@/lib/monday/items"
import { tenantForBoard } from "@/lib/monday/board-id"
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

function extractBoardId(body: Record<string, unknown>): string | null {
  const root = body.boardId ?? body.board_id
  if (typeof root === "number") return String(root)
  if (typeof root === "string" && root.trim()) return root.trim()

  const ev = body.event
  if (ev && typeof ev === "object") {
    const e = ev as Record<string, unknown>
    const b = e.boardId ?? e.board_id
    if (typeof b === "number") return String(b)
    if (typeof b === "string" && b.trim()) return b.trim()
  }

  return null
}

export type MondayWebhookResult = {
  pulseId: string | null
  boardId: string | null
  tenantId: string | null
  action: "updated" | "inserted" | "skipped"
  updated: boolean
  reason?: string
}

/**
 * Apply a Monday webhook event:
 *   1. Extract pulseId + boardId from payload (Monday sends both on most events).
 *   2. Resolve the owning tenant via `tenantForBoard(boardId)`.
 *   3. Upsert into `byred_tasks` scoped to that tenant.
 *      - Existing linked task → update title (and re-home tenant if drifted).
 *      - Unknown Monday item + tenant resolved → insert new task for that tenant.
 *      - Unknown item + no tenant resolvable → skip (no orphans).
 *
 * Legacy fallback: if the payload has no board_id and no per-tenant binding
 * resolves, fall back to `MONDAY_SYNC_TENANT_ID` env so old deployments keep
 * working. Requires `MONDAY_API_KEY` for item name lookup.
 */
export async function processMondayWebhookPayload(
  body: Record<string, unknown>
): Promise<MondayWebhookResult> {
  const tokenPresent =
    (process.env.MONDAY_API_KEY?.trim() ?? "") !== "" ||
    (process.env.MONDAY_TOKEN?.trim() ?? "") !== ""

  const pulseId = extractPulseId(body)
  let boardId = extractBoardId(body)

  if (!tokenPresent) {
    return {
      pulseId,
      boardId,
      tenantId: null,
      action: "skipped",
      updated: false,
      reason: "MONDAY_API_KEY not configured; webhook accepted but no sync.",
    }
  }

  if (!pulseId) {
    return {
      pulseId: null,
      boardId,
      tenantId: null,
      action: "skipped",
      updated: false,
      reason: "No pulse/item id in payload.",
    }
  }

  const itemsMap = await fetchMondayItemsWithBoardByIds([pulseId])
  const item = itemsMap.get(pulseId)
  if (!item) {
    return {
      pulseId,
      boardId,
      tenantId: null,
      action: "skipped",
      updated: false,
      reason: "Item not found in Monday or API error.",
    }
  }

  // Trust payload first, fall back to GraphQL.
  boardId = boardId ?? item.boardId

  let resolvedTenantId: string | null = null
  if (boardId) {
    resolvedTenantId = await tenantForBoard(boardId)
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()
  const cleanName = item.name.trim()

  const { data: rows, error: findErr } = await admin
    .from("byred_tasks")
    .select("id, title, tenant_id")
    .eq("monday_item_id", pulseId)
    .limit(2)

  if (findErr) {
    return {
      pulseId,
      boardId,
      tenantId: resolvedTenantId,
      action: "skipped",
      updated: false,
      reason: findErr.message,
    }
  }

  const hit = rows?.[0] as
    | { id: string; title: string; tenant_id: string }
    | undefined

  if (hit) {
    const targetTenant = resolvedTenantId ?? hit.tenant_id
    const titleSame = hit.title.trim() === cleanName
    const tenantSame = hit.tenant_id === targetTenant

    if (titleSame && tenantSame) {
      return {
        pulseId,
        boardId,
        tenantId: hit.tenant_id,
        action: "skipped",
        updated: false,
        reason: "Title and tenant already match Monday.",
      }
    }

    const { error: upErr } = await admin
      .from("byred_tasks")
      .update({
        title: cleanName,
        tenant_id: targetTenant,
        updated_at: now,
      } as never)
      .eq("id", hit.id)

    if (upErr) {
      return {
        pulseId,
        boardId,
        tenantId: targetTenant,
        action: "skipped",
        updated: false,
        reason: upErr.message,
      }
    }
    return {
      pulseId,
      boardId,
      tenantId: targetTenant,
      action: "updated",
      updated: true,
    }
  }

  const insertTenant = resolvedTenantId ?? mondaySyncTenantId()
  if (!insertTenant) {
    return {
      pulseId,
      boardId,
      tenantId: null,
      action: "skipped",
      updated: false,
      reason:
        "No tenant bound to this board and no MONDAY_SYNC_TENANT_ID fallback; refusing to insert.",
    }
  }

  const { error: insErr } = await admin.from("byred_tasks").insert({
    tenant_id: insertTenant,
    title: cleanName,
    monday_item_id: pulseId,
  } as never)

  if (insErr) {
    return {
      pulseId,
      boardId,
      tenantId: insertTenant,
      action: "skipped",
      updated: false,
      reason: insErr.message,
    }
  }
  return {
    pulseId,
    boardId,
    tenantId: insertTenant,
    action: "inserted",
    updated: true,
  }
}
