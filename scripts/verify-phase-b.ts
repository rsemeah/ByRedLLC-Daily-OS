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

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Cursor state
  console.log("\n=== Delta cursors ===")
  const { data: cursors } = await admin
    .from("byred_board_sync_cursors")
    .select("tenant_id, board_id, cursor_updated_at, last_full_sync_at, last_delta_sync_at")
  for (const c of (cursors ?? []) as Array<{
    tenant_id: string
    board_id: string
    cursor_updated_at: string | null
    last_full_sync_at: string | null
    last_delta_sync_at: string | null
  }>) {
    console.log(
      `  board=${c.board_id}  cursor=${c.cursor_updated_at?.slice(0, 19) ?? "—"}  full=${c.last_full_sync_at?.slice(0, 19) ?? "—"}  delta=${c.last_delta_sync_at?.slice(0, 19) ?? "—"}`
    )
  }

  // Column sync verification: how many tasks now have status/due_date/priority set
  console.log("\n=== Column sync coverage ===")
  const { data: tasks } = await admin
    .from("byred_tasks")
    .select("monday_item_id, status, priority, due_date, monday_synced_at, monday_updated_at, archived_at")
    .not("monday_item_id", "is", null)

  const rows = (tasks ?? []) as Array<{
    status: string | null
    priority: string | null
    due_date: string | null
    monday_synced_at: string | null
    monday_updated_at: string | null
    archived_at: string | null
  }>

  const total = rows.length
  const withStatus = rows.filter((r) => r.status && r.status !== "not_started").length
  const withDue = rows.filter((r) => r.due_date).length
  const withPriority = rows.filter((r) => r.priority && r.priority !== "medium").length
  const synced = rows.filter((r) => r.monday_synced_at).length
  const withUpdatedAt = rows.filter((r) => r.monday_updated_at).length
  const archived = rows.filter((r) => r.archived_at).length

  console.log(`  total Monday-linked tasks: ${total}`)
  console.log(`    non-default status:    ${withStatus}`)
  console.log(`    due date set:          ${withDue}`)
  console.log(`    non-default priority:  ${withPriority}`)
  console.log(`    monday_synced_at set:  ${synced}`)
  console.log(`    monday_updated_at set: ${withUpdatedAt}`)
  console.log(`    archived:              ${archived}`)

  // Webhook dedup table
  console.log("\n=== Webhook events recorded ===")
  const { data: events } = await admin
    .from("byred_webhook_events")
    .select("source, event_key, received_at")
    .order("received_at", { ascending: false })
    .limit(5)
  for (const e of (events ?? []) as Array<{
    source: string
    event_key: string
    received_at: string
  }>) {
    console.log(`  ${e.source}  ${e.event_key.slice(0, 60)}  ${e.received_at}`)
  }

  console.log("\n=== Sample tasks with rich sync fields ===")
  const { data: sample } = await admin
    .from("byred_tasks")
    .select("title, status, priority, due_date")
    .not("status", "is", null)
    .not("due_date", "is", null)
    .limit(5)
  for (const s of (sample ?? []) as Array<{
    title: string
    status: string
    priority: string
    due_date: string | null
  }>) {
    console.log(
      `  [${s.status.padEnd(12)}] [${(s.priority ?? "—").padEnd(8)}] due=${s.due_date ?? "—"}  "${s.title}"`
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
