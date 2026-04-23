import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// Minimal .env.local loader — no extra dep.
const envPath = resolve(process.cwd(), ".env.local")
try {
  const raw = readFileSync(envPath, "utf8")
  for (const line of raw.split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq < 0) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!process.env[k]) process.env[k] = v
  }
} catch {}

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const MONDAY_TOKEN =
  process.env.MONDAY_API_KEY?.trim() || process.env.MONDAY_TOKEN?.trim()

if (!SB_URL || !SB_KEY) throw new Error("Missing Supabase env vars")
if (!MONDAY_TOKEN) throw new Error("Missing MONDAY_API_KEY or MONDAY_TOKEN")

const admin = createClient(SB_URL, SB_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function monday<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: MONDAY_TOKEN!,
    },
    body: JSON.stringify({ query, variables }),
  })
  const body = (await res.json()) as { data?: T; errors?: Array<{ message: string }> }
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "))
  if (!body.data) throw new Error("no data")
  return body.data
}

async function main() {
  console.log("\n=== TENANTS ===")
  const { data: tenants } = await admin
    .from("byred_tenants")
    .select("id, name, active, monday_board_id, monday_group_id")
    .order("name", { ascending: true })

  const tenantRows = (tenants ?? []) as Array<{
    id: string
    name: string
    active: boolean | null
    monday_board_id: string | null
    monday_group_id: string | null
  }>

  console.log(`Total tenants: ${tenantRows.length}`)
  for (const t of tenantRows) {
    console.log(
      `  [${t.active ? "A" : "i"}] ${t.name}  board=${t.monday_board_id ?? "—"}  group=${t.monday_group_id ?? "—"}  id=${t.id}`
    )
  }

  console.log("\n=== TASK COUNTS PER TENANT ===")
  const { data: tasks } = await admin
    .from("byred_tasks")
    .select("id, tenant_id, title, monday_item_id, status, created_at")

  const taskRows = (tasks ?? []) as Array<{
    id: string
    tenant_id: string
    title: string
    monday_item_id: string | null
    status: string
    created_at: string
  }>

  console.log(`Total tasks: ${taskRows.length}`)
  const byTenant = new Map<string, typeof taskRows>()
  for (const task of taskRows) {
    const arr = byTenant.get(task.tenant_id) ?? []
    arr.push(task)
    byTenant.set(task.tenant_id, arr)
  }
  for (const t of tenantRows) {
    const ts = byTenant.get(t.id) ?? []
    const linkedCount = ts.filter((x) => x.monday_item_id).length
    console.log(
      `  ${t.name}: total=${ts.length} linked=${linkedCount}  sample=${
        ts
          .slice(0, 3)
          .map((x) => `"${x.title}"[${x.monday_item_id ?? "–"}]`)
          .join(", ") || "(none)"
      }`
    )
  }

  const orphans = taskRows.filter(
    (t) => !tenantRows.some((x) => x.id === t.tenant_id)
  )
  if (orphans.length > 0) {
    console.log(`\n!! ORPHAN TASKS (tenant_id not in byred_tenants): ${orphans.length}`)
    for (const o of orphans.slice(0, 5)) {
      console.log(`  ${o.id} tenant=${o.tenant_id} title="${o.title}"`)
    }
  }

  console.log("\n=== LIVE MONDAY BOARDS (what the token sees) ===")
  const data = await monday<{
    boards: Array<{
      id: string
      name: string
      state: string
      items_count: number | null
      workspace: { id: string; name: string } | null
    }>
  }>(`
    query {
      boards(limit: 50) {
        id
        name
        state
        items_count
        workspace { id name }
      }
    }
  `)
  console.log(`Monday returned ${data.boards.length} boards for this token:`)
  for (const b of data.boards) {
    console.log(
      `  ${b.id.padStart(12)} | ${b.state.padEnd(6)} | items=${b.items_count ?? "?"} | ws=${b.workspace?.name ?? "—"} | ${b.name}`
    )
  }

  console.log("\n=== CROSS-CHECK tenants.monday_board_id ↔ monday boards ===")
  const boardById = new Map(data.boards.map((b) => [b.id, b]))
  for (const t of tenantRows) {
    if (!t.monday_board_id) continue
    const b = boardById.get(t.monday_board_id)
    console.log(
      `  ${t.name}  →  ${t.monday_board_id}  ${
        b ? `✓ "${b.name}" items=${b.items_count}` : "✗ NOT VISIBLE TO THIS TOKEN"
      }`
    )
  }

  console.log("\n=== SAMPLE ITEMS PER BOARD ===")
  for (const t of tenantRows.filter((x) => x.monday_board_id)) {
    try {
      const resp = await monday<{
        boards: Array<{
          items_page: { items: Array<{ id: string; name: string }> }
        }> | null
      }>(
        `
        query ($ids: [ID!]) {
          boards(ids: $ids) {
            items_page(limit: 5) {
              items { id name }
            }
          }
        }
      `,
        { ids: [t.monday_board_id] }
      )
      const items = resp.boards?.[0]?.items_page.items ?? []
      console.log(
        `  ${t.name} [${t.monday_board_id}]: ${items.length} items → ${
          items.map((i) => `"${i.name}"(${i.id})`).join(", ") || "(empty)"
        }`
      )
    } catch (e) {
      console.log(
        `  ${t.name} [${t.monday_board_id}]: ERROR ${
          e instanceof Error ? e.message : String(e)
        }`
      )
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
