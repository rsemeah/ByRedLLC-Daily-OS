/**
 * Precision audit: fetch every item from every bound Monday board with full
 * column values, then compare title, status, priority, due_date against what
 * is stored in byred_tasks. Reports mismatches per field per board.
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

try {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
  for (const line of raw.split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq < 0) continue
    let v = t.slice(eq + 1).trim()
    if ((v[0] === '"' && v.slice(-1) === '"') || (v[0] === "'" && v.slice(-1) === "'"))
      v = v.slice(1, -1)
    if (!process.env[t.slice(0, eq).trim()]) process.env[t.slice(0, eq).trim()] = v
  }
} catch {
  console.warn("Could not read .env.local — relying on existing env vars")
}

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const MONDAY_TOKEN = (process.env.MONDAY_API_KEY ?? process.env.MONDAY_TOKEN ?? "").trim()
if (!SB_URL || !SB_KEY) { console.error("Missing Supabase env vars"); process.exit(1) }
if (!MONDAY_TOKEN) { console.error("Missing MONDAY_API_KEY or MONDAY_TOKEN"); process.exit(1) }

const admin = createClient(SB_URL, SB_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// --- Monday helpers (standalone, no server-only) ---

async function monday<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: MONDAY_TOKEN },
    body: JSON.stringify({ query, variables }),
  })
  const body = (await res.json()) as { data?: T; errors?: Array<{ message: string }> }
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "))
  if (!body.data) throw new Error("Monday returned no data")
  return body.data
}

type RawCol = { id: string; type: string | null; text: string | null; value: string | null }
type RawItem = { id: string; name: string; updated_at: string | null; column_values: RawCol[] }

async function fetchFullBoard(boardId: string): Promise<RawItem[]> {
  const first = await monday<{
    boards: Array<{ items_page: { cursor: string | null; items: RawItem[] } }> | null
  }>(
    `query ($ids: [ID!], $limit: Int!) {
       boards(ids: $ids) { items_page(limit: $limit) { cursor items { id name updated_at column_values { id type text value } } } }
     }`,
    { ids: [boardId], limit: 500 }
  )
  const page = first.boards?.[0]?.items_page
  if (!page) return []
  const items = [...page.items]
  let cursor = page.cursor
  let safety = 0
  while (cursor && safety < 50) {
    const next = await monday<{
      next_items_page: { cursor: string | null; items: RawItem[] }
    }>(
      `query ($cursor: String!, $limit: Int!) {
         next_items_page(cursor: $cursor, limit: $limit) { cursor items { id name updated_at column_values { id type text value } } }
       }`,
      { cursor, limit: 500 }
    )
    items.push(...next.next_items_page.items)
    cursor = next.next_items_page.cursor
    safety += 1
  }
  return items
}

// --- Field mapping (mirrors lib/monday/map-monday-fields.ts) ---

function mapStatus(label: string | null | undefined): string | null {
  if (!label) return null
  const l = label.trim().toLowerCase()
  if (!l) return null
  if (l === "done" || l === "complete" || l === "completed") return "done"
  if (l === "cancelled" || l === "canceled" || l === "archived") return "cancelled"
  if (l === "working on it" || l === "in progress" || l === "in-progress" || l === "in_progress" || l === "doing") return "in_progress"
  if (l === "stuck" || l === "blocked" || l === "blocker") return "blocked"
  if (l === "overdue" || l === "late" || l === "past due") return "overdue"
  if (l === "not started" || l === "not_started" || l === "to do" || l === "todo" || l === "backlog") return "not_started"
  return null
}

function mapPriority(label: string | null | undefined): string | null {
  if (!label) return null
  const l = label.trim().toLowerCase()
  if (!l) return null
  if (l === "critical" || l === "urgent" || l === "highest" || l === "p0") return "critical"
  if (l === "high" || l === "p1") return "high"
  if (l === "medium" || l === "mid" || l === "p2" || l === "normal") return "medium"
  if (l === "low" || l === "p3" || l === "later") return "low"
  return null
}

function extractFields(item: RawItem) {
  let statusLabel: string | null = null
  let dueDate: string | null = null
  let priorityLabel: string | null = null

  for (const c of item.column_values ?? []) {
    const type = (c.type ?? "").toLowerCase()
    const id = (c.id ?? "").toLowerCase()
    const text = c.text?.trim() || null

    if (!statusLabel && (type === "status" || type === "color")) statusLabel = text
    if (!dueDate) {
      if (type === "date" && text) dueDate = text.slice(0, 10)
      else if (type === "timeline" || type === "timerange") {
        try {
          const parsed = c.value ? (JSON.parse(c.value) as { from?: string }) : null
          if (parsed?.from) dueDate = String(parsed.from).slice(0, 10)
        } catch {}
      }
    }
    if (!priorityLabel && (id.includes("priority") || id === "prio" || type === "priority")) {
      priorityLabel = text
    }
  }

  return {
    title: item.name.trim() || "(untitled)",
    mondayStatus: statusLabel,
    mappedStatus: mapStatus(statusLabel),
    mondayPriority: priorityLabel,
    mappedPriority: mapPriority(priorityLabel),
    dueDate,
    updatedAt: item.updated_at,
  }
}

// --- Main audit ---

type DbTask = {
  id: string
  title: string
  status: string | null
  priority: string | null
  due_date: string | null
  monday_item_id: string | null
  monday_updated_at: string | null
  tenant_id: string
  archived_at: string | null
}

type Mismatch = {
  mondayItemId: string
  title: string
  field: string
  monday: string | null
  db: string | null
}

async function main() {
  const { data: tenants } = await admin
    .from("byred_tenants")
    .select("id, name, monday_board_id")
    .not("monday_board_id", "is", null)
    .eq("active", true)
    .order("name")

  const tenantRows = (tenants ?? []) as Array<{ id: string; name: string; monday_board_id: string | null }>

  let totalItems = 0
  let totalMismatches = 0
  let totalMissing = 0
  let totalOrphans = 0

  for (const tenant of tenantRows) {
    if (!tenant.monday_board_id) continue
    console.log(`\n${"=".repeat(70)}`)
    console.log(`BOARD: ${tenant.name}  (${tenant.monday_board_id})  tenant=${tenant.id}`)
    console.log("=".repeat(70))

    // Fetch all items from Monday with full column data
    const mondayItems = await fetchFullBoard(tenant.monday_board_id)
    console.log(`  Monday items: ${mondayItems.length}`)

    // Fetch all DB tasks for this tenant with monday_item_id
    const { data: dbTasks } = await admin
      .from("byred_tasks")
      .select("id, title, status, priority, due_date, monday_item_id, monday_updated_at, tenant_id, archived_at")
      .eq("tenant_id", tenant.id)
      .not("monday_item_id", "is", null)

    const dbRows = (dbTasks ?? []) as DbTask[]
    console.log(`  DB tasks (linked): ${dbRows.length}`)

    const dbByMondayId = new Map<string, DbTask>()
    for (const r of dbRows) {
      if (r.monday_item_id) dbByMondayId.set(r.monday_item_id, r)
    }

    const mismatches: Mismatch[] = []
    const missing: string[] = []
    let matched = 0

    for (const item of mondayItems) {
      totalItems++
      const mondayId = String(item.id)
      const db = dbByMondayId.get(mondayId)

      if (!db) {
        missing.push(`${mondayId} "${item.name.slice(0, 50)}"`)
        totalMissing++
        continue
      }

      matched++
      const m = extractFields(item)

      // Title check
      if (db.title.trim() !== m.title) {
        mismatches.push({ mondayItemId: mondayId, title: m.title, field: "title", monday: m.title, db: db.title })
      }

      // Status check: only flag if Monday has a mappable status and it differs
      if (m.mappedStatus && db.status !== m.mappedStatus) {
        mismatches.push({ mondayItemId: mondayId, title: m.title, field: "status", monday: `${m.mondayStatus} → ${m.mappedStatus}`, db: db.status })
      }

      // Priority check: only flag if Monday has a mappable priority and it differs
      if (m.mappedPriority && db.priority !== m.mappedPriority) {
        mismatches.push({ mondayItemId: mondayId, title: m.title, field: "priority", monday: `${m.mondayPriority} → ${m.mappedPriority}`, db: db.priority })
      }

      // Due date check
      if (m.dueDate && db.due_date !== m.dueDate) {
        mismatches.push({ mondayItemId: mondayId, title: m.title, field: "due_date", monday: m.dueDate, db: db.due_date })
      }
    }

    // Orphan check: DB tasks whose monday_item_id is not in the Monday board
    const mondayIdSet = new Set(mondayItems.map((i) => String(i.id)))
    const orphans = dbRows.filter((r) => r.monday_item_id && !mondayIdSet.has(r.monday_item_id) && !r.archived_at)

    console.log(`  Matched: ${matched}`)
    console.log(`  Missing from DB (in Monday, not in tasks): ${missing.length}`)
    console.log(`  Orphan DB rows (in DB, not in Monday, not archived): ${orphans.length}`)
    console.log(`  Field mismatches: ${mismatches.length}`)

    if (mismatches.length > 0) {
      console.log(`\n  MISMATCHES:`)
      const byField = new Map<string, Mismatch[]>()
      for (const mm of mismatches) {
        const arr = byField.get(mm.field) ?? []
        arr.push(mm)
        byField.set(mm.field, arr)
      }
      for (const [field, items] of byField) {
        console.log(`    [${field}] — ${items.length} mismatch(es)`)
        for (const mm of items.slice(0, 10)) {
          console.log(`      item=${mm.mondayItemId}  monday=${JSON.stringify(mm.monday)}  db=${JSON.stringify(mm.db)}  "${mm.title.slice(0, 50)}"`)
        }
        if (items.length > 10) console.log(`      ... and ${items.length - 10} more`)
      }
    }

    if (missing.length > 0 && missing.length <= 5) {
      console.log(`\n  MISSING FROM DB:`)
      for (const m of missing) console.log(`    ${m}`)
    } else if (missing.length > 5) {
      console.log(`\n  MISSING FROM DB (first 5 of ${missing.length}):`)
      for (const m of missing.slice(0, 5)) console.log(`    ${m}`)
    }

    if (orphans.length > 0 && orphans.length <= 5) {
      console.log(`\n  ORPHAN DB ROWS (not archived, not in Monday):`)
      for (const o of orphans) console.log(`    task=${o.id}  monday_item=${o.monday_item_id}  "${o.title.slice(0, 50)}"`)
    } else if (orphans.length > 5) {
      console.log(`\n  ORPHAN DB ROWS (first 5 of ${orphans.length}):`)
      for (const o of orphans.slice(0, 5)) console.log(`    task=${o.id}  monday_item=${o.monday_item_id}  "${o.title.slice(0, 50)}"`)
    }

    totalMismatches += mismatches.length
    totalOrphans += orphans.length
  }

  console.log(`\n${"=".repeat(70)}`)
  console.log("GRAND TOTALS")
  console.log("=".repeat(70))
  console.log(`  Boards audited:      ${tenantRows.length}`)
  console.log(`  Monday items:        ${totalItems}`)
  console.log(`  Field mismatches:    ${totalMismatches}`)
  console.log(`  Missing from DB:     ${totalMissing}`)
  console.log(`  Orphan DB rows:      ${totalOrphans}`)
  console.log(`  Verdict:             ${totalMismatches === 0 && totalMissing === 0 && totalOrphans === 0 ? "✓ CLEAN" : "⚠ ISSUES FOUND"}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
