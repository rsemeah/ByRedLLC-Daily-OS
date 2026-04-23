import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import {
  getBoundTenantBoards,
  mondayBoardId,
  type TenantBoardBinding,
} from "@/lib/monday/board-id"
import { fetchAllBoardItems, type MondayBoardItem } from "@/lib/monday/items"
import { mondaySyncTenantId } from "@/lib/monday/sync-tenant"
import { tryAcquireSyncLock } from "@/lib/monday/sync-lock"
import {
  mapMondayPriority,
  mapMondayStatus,
} from "@/lib/monday/map-monday-fields"

export type MondayPullSyncResult = {
  tenantId: string
  tenantName: string
  boardId: string
  boardItems: number
  linked: number
  inserted: number
  updated: number
  unchanged: number
  reassigned: number
  archived: number
  delta: boolean
  errors: number
}

export type MondayPullSyncBatch = {
  tenants: number
  skipped?: boolean
  skippedReason?: string
  totals: {
    boardItems: number
    linked: number
    inserted: number
    updated: number
    unchanged: number
    reassigned: number
    archived: number
    errors: number
  }
  results: MondayPullSyncResult[]
}

type SupabaseAdmin = ReturnType<typeof createAdminClient>

const UPSERT_CHUNK = 500

const EMPTY_TOTALS: MondayPullSyncBatch["totals"] = {
  boardItems: 0,
  linked: 0,
  inserted: 0,
  updated: 0,
  unchanged: 0,
  reassigned: 0,
  archived: 0,
  errors: 0,
}

type UpsertRow = {
  tenant_id: string
  title: string
  monday_item_id: string
  monday_updated_at: string | null
  monday_synced_at: string
  status?: string
  priority?: string
  due_date?: string | null
  owner_user_id?: string | null
  archived_at: null
  updated_at: string
}

type ExistingRow = {
  id: string
  tenant_id: string
  title: string
  status: string | null
  priority: string | null
  due_date: string | null
  owner_user_id: string | null
  monday_item_id: string | null
  monday_updated_at: string | null
  archived_at: string | null
}

function rowDiffers(hit: ExistingRow, next: UpsertRow): boolean {
  if (hit.tenant_id !== next.tenant_id) return true
  if (hit.title.trim() !== next.title.trim()) return true
  if (hit.archived_at) return true // re-activating an archived row
  if (next.status !== undefined && hit.status !== next.status) return true
  if (next.priority !== undefined && hit.priority !== next.priority) return true
  if (next.due_date !== undefined && hit.due_date !== next.due_date) return true
  if (
    next.owner_user_id !== undefined &&
    hit.owner_user_id !== next.owner_user_id
  )
    return true
  if (
    next.monday_updated_at !== null &&
    hit.monday_updated_at !== next.monday_updated_at
  )
    return true
  return false
}

/**
 * Map monday_user_id → byred_users.id for every assignee seen on this
 * board's items. Falls back to null when no byred_user exists — the pull
 * never creates placeholder byred_users, that's the Monday users sync's
 * job (run via `syncMondayUsersToByred`).
 */
async function buildOwnerLookup(
  admin: SupabaseAdmin,
  items: MondayBoardItem[]
): Promise<Map<string, string>> {
  const mondayIds = new Set<string>()
  for (const item of items) {
    for (const a of item.assignees) {
      if (a.mondayUserId) mondayIds.add(a.mondayUserId)
    }
  }
  if (mondayIds.size === 0) return new Map()

  const { data, error } = await admin
    .from("byred_users")
    .select("id, monday_user_id")
    .in("monday_user_id", [...mondayIds])

  if (error) {
    console.warn(
      JSON.stringify({
        event: "monday_pull.owner_lookup_failed",
        error: error.message,
      })
    )
    return new Map()
  }

  const out = new Map<string, string>()
  for (const r of (data ?? []) as Array<{ id: string; monday_user_id: string | null }>) {
    if (r.monday_user_id) out.set(String(r.monday_user_id), r.id)
  }
  return out
}

async function getCursor(
  admin: SupabaseAdmin,
  tenantId: string,
  boardId: string
): Promise<string | null> {
  const { data } = await admin
    .from("byred_board_sync_cursors")
    .select("cursor_updated_at")
    .eq("tenant_id", tenantId)
    .eq("board_id", boardId)
    .maybeSingle()
  const row = data as { cursor_updated_at: string | null } | null
  return row?.cursor_updated_at ?? null
}

async function persistCursor(
  admin: SupabaseAdmin,
  tenantId: string,
  boardId: string,
  newest: string | null,
  delta: boolean
): Promise<void> {
  const now = new Date().toISOString()
  const patch = delta
    ? { last_delta_sync_at: now }
    : { last_full_sync_at: now, last_delta_sync_at: now }

  const { error } = await admin.from("byred_board_sync_cursors").upsert(
    {
      tenant_id: tenantId,
      board_id: boardId,
      cursor_updated_at: newest,
      ...patch,
    } as never,
    { onConflict: "tenant_id,board_id" }
  )

  if (error) {
    console.warn(
      JSON.stringify({
        event: "monday_pull.cursor_persist_failed",
        tenant_id: tenantId,
        board_id: boardId,
        error: error.message,
      })
    )
  }
}

/**
 * Reconcile one board's items into `byred_tasks` scoped to `binding.tenantId`.
 *
 * Strategy:
 *  1. Look up a delta cursor for (tenant, board). If present, only fetch
 *     items updated after it. Every Nth run (or on first run) do a full pull
 *     to catch archives and to recover if the cursor drifts.
 *  2. Classify the fetched items against existing rows.
 *  3. Bulk upsert changed rows via the composite unique index.
 *  4. If this was a full pull, archive rows whose `monday_item_id` was not in
 *     the board's current item set (Monday item deleted/archived upstream).
 *  5. Persist the newest `updated_at` as the next cursor.
 */
async function pullOneBoard(
  admin: SupabaseAdmin,
  binding: TenantBoardBinding,
  opts: { forceFull?: boolean } = {}
): Promise<MondayPullSyncResult> {
  const base: MondayPullSyncResult = {
    tenantId: binding.tenantId,
    tenantName: binding.tenantName,
    boardId: binding.boardId,
    boardItems: 0,
    linked: 0,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    reassigned: 0,
    archived: 0,
    delta: false,
    errors: 0,
  }

  const cursor = opts.forceFull
    ? null
    : await getCursor(admin, binding.tenantId, binding.boardId)
  const delta = cursor !== null && !opts.forceFull
  base.delta = delta

  const boardItems: MondayBoardItem[] = await fetchAllBoardItems(
    binding.boardId,
    delta ? { updatedAfter: cursor! } : {}
  )
  base.boardItems = boardItems.length

  if (boardItems.length === 0 && !delta) {
    // First-ever or forced full pull that returned nothing: still write
    // cursor so future runs are delta.
    await persistCursor(admin, binding.tenantId, binding.boardId, null, delta)
    return base
  }

  const ids = boardItems.map((i) => String(i.id))

  let existing = new Map<string, ExistingRow>()
  if (ids.length > 0) {
    const { data: existingRows, error: fetchErr } = await admin
      .from("byred_tasks")
      .select(
        "id, title, monday_item_id, monday_updated_at, tenant_id, status, priority, due_date, owner_user_id, archived_at"
      )
      .in("monday_item_id", ids)

    if (fetchErr) throw new Error(`tasks lookup: ${fetchErr.message}`)

    for (const r of (existingRows ?? []) as ExistingRow[]) {
      if (r.monday_item_id) existing.set(String(r.monday_item_id), r)
    }
  }
  base.linked = existing.size

  // Resolve Monday assignees → byred_users.id once per pull (not per item).
  const ownerByMondayId = await buildOwnerLookup(admin, boardItems)

  const now = new Date().toISOString()
  type UpdateRow = UpsertRow & { id: string }
  const updates: UpdateRow[] = []
  const inserts: UpsertRow[] = []

  for (const item of boardItems) {
    const mondayId = String(item.id)
    const clean = item.name.trim() || "(untitled)"
    const mappedStatus = mapMondayStatus(item.status)
    const mappedPriority = mapMondayPriority(item.priorityLabel)
    const primaryAssignee = item.assignees[0] ?? null
    const resolvedOwner = primaryAssignee
      ? ownerByMondayId.get(primaryAssignee.mondayUserId) ?? null
      : null

    const next: UpsertRow = {
      tenant_id: binding.tenantId,
      title: clean,
      monday_item_id: mondayId,
      monday_updated_at: item.updatedAt ?? null,
      monday_synced_at: now,
      archived_at: null,
      updated_at: now,
    }
    if (mappedStatus) next.status = mappedStatus
    if (mappedPriority) next.priority = mappedPriority
    if (item.dueDate !== null) next.due_date = item.dueDate
    // Only write owner_user_id when (a) Monday told us someone is assigned
    // and (b) that someone matches a byred_users row. When Monday shows no
    // assignee we explicitly clear the owner on our side so the app mirrors
    // upstream state.
    if (primaryAssignee) {
      next.owner_user_id = resolvedOwner
    } else {
      next.owner_user_id = null
    }

    const hit = existing.get(mondayId)
    if (hit) {
      if (!rowDiffers(hit, next)) {
        base.unchanged += 1
        continue
      }
      if (hit.tenant_id !== binding.tenantId) base.reassigned += 1
      updates.push({ ...next, id: hit.id })
    } else {
      // New row: guarantee NOT NULL columns have concrete values; DB-level
      // defaults cover the rest.
      if (!next.status) next.status = "not_started"
      inserts.push(next)
    }
  }

  // UPDATES: by primary key. This naturally handles tenant_id reassignment
  // without wrestling with ON CONFLICT on a composite key.
  for (const row of updates) {
    const { id, ...patch } = row
    const { error } = await admin
      .from("byred_tasks")
      .update(patch as never)
      .eq("id", id)
    if (error) {
      base.errors += 1
      console.error(
        JSON.stringify({
          event: "monday_pull.update_failed",
          tenant_id: binding.tenantId,
          board_id: binding.boardId,
          task_id: id,
          error: error.message,
        })
      )
    } else {
      base.updated += 1
    }
  }

  // INSERTS: bulk-chunked.
  for (let i = 0; i < inserts.length; i += UPSERT_CHUNK) {
    const chunk = inserts.slice(i, i + UPSERT_CHUNK)
    const { error } = await admin.from("byred_tasks").insert(chunk as never)
    if (error) {
      base.errors += chunk.length
      console.error(
        JSON.stringify({
          event: "monday_pull.insert_failed",
          tenant_id: binding.tenantId,
          board_id: binding.boardId,
          chunk_size: chunk.length,
          error: error.message,
        })
      )
    } else {
      base.inserted += chunk.length
    }
  }

  // Deletion reconciliation: only on full pulls. We'd need to know the
  // complete board item set to archive orphans safely, and a delta pull
  // only sees deltas.
  if (!delta) {
    const { data: allLinkedRows, error: listErr } = await admin
      .from("byred_tasks")
      .select("id, monday_item_id")
      .eq("tenant_id", binding.tenantId)
      .not("monday_item_id", "is", null)
      .is("archived_at", null)

    if (listErr) {
      console.warn(
        JSON.stringify({
          event: "monday_pull.archive_list_failed",
          tenant_id: binding.tenantId,
          board_id: binding.boardId,
          error: listErr.message,
        })
      )
    } else {
      const linkedRows = (allLinkedRows ?? []) as Array<{
        id: string
        monday_item_id: string | null
      }>
      const currentMondaySet = new Set(ids)
      const orphanIds = linkedRows
        .filter((r) => r.monday_item_id && !currentMondaySet.has(r.monday_item_id))
        .map((r) => r.id)

      for (let i = 0; i < orphanIds.length; i += UPSERT_CHUNK) {
        const chunk = orphanIds.slice(i, i + UPSERT_CHUNK)
        const { error: archErr } = await admin
          .from("byred_tasks")
          .update({
            archived_at: now,
            status: "cancelled",
            updated_at: now,
          } as never)
          .in("id", chunk)
        if (archErr) {
          base.errors += chunk.length
          console.error(
            JSON.stringify({
              event: "monday_pull.archive_failed",
              tenant_id: binding.tenantId,
              board_id: binding.boardId,
              chunk_size: chunk.length,
              error: archErr.message,
            })
          )
        } else {
          base.archived += chunk.length
        }
      }
    }
  }

  // Advance cursor to the newest Monday updated_at we saw. Parse to ms so
  // timezone-suffix differences ("Z" vs "+00:00") can't trip the comparison.
  const newest = boardItems.reduce<string | null>((acc, i) => {
    if (!i.updatedAt) return acc
    if (!acc) return i.updatedAt
    const a = Date.parse(acc)
    const b = Date.parse(i.updatedAt)
    if (Number.isNaN(b)) return acc
    return !Number.isNaN(a) && a >= b ? acc : i.updatedAt
  }, cursor)
  await persistCursor(admin, binding.tenantId, binding.boardId, newest, delta)

  return base
}

/**
 * Pull a single tenant's Monday board into `byred_tasks`. Used by the
 * per-tenant sync route (tab "sync now" button). Same reconciliation logic
 * as the cron path but scoped to one board, so it returns quickly and does
 * not need the cross-process sync lock — the composite unique index is
 * enough to keep concurrent runs safe at the DB layer.
 */
export async function pullMondayBoardForTenant(
  tenantId: string,
  opts: { forceFull?: boolean } = {}
): Promise<MondayPullSyncResult | null> {
  const admin = createAdminClient()
  const bindings = await getBoundTenantBoards({ activeOnly: true })
  const binding = bindings.find((b) => b.tenantId === tenantId)
  if (!binding) return null
  return pullOneBoard(admin, binding, opts)
}

/**
 * Full multi-tenant Monday pull. Acquires a cross-process sync lock so
 * overlapping crons cannot race. If the lock is already held, returns a
 * skipped batch — never blocks or double-runs.
 *
 * The caller sets `opts.forceFull = true` to force a full sync (picks up
 * deletes); otherwise delta sync is used when a cursor exists.
 *
 * Idempotent via the `(tenant_id, monday_item_id)` composite unique.
 */
export async function pullAllMondayBoardsIntoTasks(
  opts: { forceFull?: boolean } = {}
): Promise<MondayPullSyncBatch> {
  const admin = createAdminClient()

  const lock = await tryAcquireSyncLock({
    name: "monday_pull",
    ttlSeconds: 300,
    admin,
  })

  if (!lock) {
    console.warn(
      JSON.stringify({
        event: "monday_pull.skipped_locked",
        message: "Another monday_pull run is in progress.",
      })
    )
    return {
      tenants: 0,
      skipped: true,
      skippedReason: "Another sync run is in progress.",
      totals: { ...EMPTY_TOTALS },
      results: [],
    }
  }

  try {
    const bindings = await getBoundTenantBoards({ activeOnly: true })

    if (bindings.length === 0) {
      const legacyTenantId = mondaySyncTenantId()
      const legacyBoardId = mondayBoardId()
      if (!legacyTenantId) {
        return {
          tenants: 0,
          totals: { ...EMPTY_TOTALS },
          results: [],
        }
      }
      const res = await pullOneBoard(
        admin,
        {
          tenantId: legacyTenantId,
          tenantName: "(legacy env tenant)",
          boardId: legacyBoardId,
          groupId: null,
          active: true,
        },
        opts
      )
      return {
        tenants: 1,
        totals: pick(res),
        results: [res],
      }
    }

    const results: MondayPullSyncResult[] = []
    for (const b of bindings) {
      try {
        const r = await pullOneBoard(admin, b, opts)
        results.push(r)
      } catch (e) {
        results.push({
          tenantId: b.tenantId,
          tenantName: b.tenantName,
          boardId: b.boardId,
          boardItems: 0,
          linked: 0,
          inserted: 0,
          updated: 0,
          unchanged: 0,
          reassigned: 0,
          archived: 0,
          delta: false,
          errors: 1,
        })
        console.error(
          JSON.stringify({
            event: "monday_pull.tenant_failed",
            tenant_id: b.tenantId,
            tenant_name: b.tenantName,
            board_id: b.boardId,
            error: e instanceof Error ? e.message : String(e),
          })
        )
      }
    }

    const totals = results.reduce(
      (acc, r) => ({
        boardItems: acc.boardItems + r.boardItems,
        linked: acc.linked + r.linked,
        inserted: acc.inserted + r.inserted,
        updated: acc.updated + r.updated,
        unchanged: acc.unchanged + r.unchanged,
        reassigned: acc.reassigned + r.reassigned,
        archived: acc.archived + r.archived,
        errors: acc.errors + r.errors,
      }),
      { ...EMPTY_TOTALS }
    )

    return { tenants: results.length, totals, results }
  } finally {
    await lock.release()
  }
}

function pick(r: MondayPullSyncResult): MondayPullSyncBatch["totals"] {
  return {
    boardItems: r.boardItems,
    linked: r.linked,
    inserted: r.inserted,
    updated: r.updated,
    unchanged: r.unchanged,
    reassigned: r.reassigned,
    archived: r.archived,
    errors: r.errors,
  }
}
