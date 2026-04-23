import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

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

type AnySupabase = {
  from: ReturnType<typeof createAdminClient>["from"]
}

async function readBoundBoards(
  client: AnySupabase,
  activeOnly: boolean
): Promise<TenantBoardBinding[]> {
  let q = client
    .from("byred_tenants")
    .select("id, name, active, monday_board_id, monday_group_id")
    .not("monday_board_id", "is", null)

  if (activeOnly) q = q.eq("active", true)

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

/**
 * Every tenant that has a Monday board bound. **Admin-scoped** — bypasses RLS.
 * Source of truth for cron/webhook fan-out. Do not call from user-facing
 * request handlers; use `getBoundTenantBoardsForCurrentUser()` instead.
 */
export async function getBoundTenantBoards(opts: {
  activeOnly?: boolean
} = {}): Promise<TenantBoardBinding[]> {
  return readBoundBoards(createAdminClient(), opts.activeOnly !== false)
}

/**
 * RLS-scoped read of bound boards for the current authenticated user. Only
 * returns tenants the user is a member of. Safe for UI.
 */
export async function getBoundTenantBoardsForCurrentUser(opts: {
  activeOnly?: boolean
} = {}): Promise<TenantBoardBinding[]> {
  const supabase = await createClient()
  return readBoundBoards(supabase, opts.activeOnly !== false)
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
