import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

/** Legacy single-board default, used only when no per-tenant binding exists. */
export const DEFAULT_MONDAY_BOARD_ID = "18408502764"

/** Legacy single-board resolver (env or built-in default). Prefer `boardIdForTenant`. */
export function mondayBoardId(): string {
  const fromEnv = process.env.MONDAY_BOARD_ID?.trim()
  return fromEnv || DEFAULT_MONDAY_BOARD_ID
}

export type TenantBoardBinding = {
  tenantId: string
  tenantName: string
  boardId: string
  groupId: string | null
  active: boolean
}

/** Board id bound to a specific tenant, or null if unbound. */
export async function boardIdForTenant(tenantId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("byred_tenants")
    .select("monday_board_id")
    .eq("id", tenantId)
    .maybeSingle()

  if (error || !data) return null
  const row = data as { monday_board_id: string | null }
  return row.monday_board_id?.trim() || null
}

/** Every tenant that has a Monday board bound. Source of truth for sync fan-out. */
export async function getBoundTenantBoards(opts: {
  activeOnly?: boolean
} = {}): Promise<TenantBoardBinding[]> {
  const admin = createAdminClient()
  let q = admin
    .from("byred_tenants")
    .select("id, name, active, monday_board_id, monday_group_id")
    .not("monday_board_id", "is", null)

  if (opts.activeOnly !== false) {
    q = q.eq("active", true)
  }

  const { data, error } = await q
  if (error) throw new Error(`tenants.boards: ${error.message}`)

  return ((data ?? []) as Array<{
    id: string
    name: string
    active: boolean | null
    monday_board_id: string | null
    monday_group_id: string | null
  }>)
    .filter((r) => r.monday_board_id?.trim())
    .map((r) => ({
      tenantId: r.id,
      tenantName: r.name,
      boardId: r.monday_board_id!.trim(),
      groupId: r.monday_group_id?.trim() || null,
      active: r.active ?? true,
    }))
}

/** Reverse lookup: which tenant owns this Monday board? */
export async function tenantForBoard(boardId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("byred_tenants")
    .select("id")
    .eq("monday_board_id", boardId.trim())
    .maybeSingle()

  if (error || !data) return null
  return (data as { id: string }).id
}
