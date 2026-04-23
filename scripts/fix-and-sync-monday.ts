import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

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

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const MONDAY_TOKEN =
  process.env.MONDAY_API_KEY?.trim() || process.env.MONDAY_TOKEN?.trim()

if (!SB_URL || !SB_KEY || !MONDAY_TOKEN) {
  throw new Error("Missing SUPABASE or MONDAY env vars")
}

const admin = createClient(SB_URL, SB_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type Binding = {
  matchLike: string
  boardId: string
  label: string
}

const FIXED_BINDINGS: Binding[] = [
  { matchLike: "%officespace%",            boardId: "18408502764", label: "🏛️ OfficeSpace" },
  { matchLike: "%hirewire%",               boardId: "18408502755", label: "🚀 HireWire" },
  { matchLike: "%authentic hadith%",       boardId: "18408502757", label: "📖 Authentic Hadith" },
  { matchLike: "%redlantern studios — daily%", boardId: "18408502761", label: "🪔 RedLantern Daily" },
  { matchLike: "%clarity by redlantern%",  boardId: "18408502767", label: "🌟 Clarity" },
  { matchLike: "%beauty by red%",          boardId: "18408919540", label: "👸🏻 Beauty By Red" },
  { matchLike: "%paradise property%",      boardId: "18409054873", label: "🧰 Paradise Property" },
  { matchLike: "%team pulse%",             boardId: "18408920377", label: "🏁 Team Pulse (Agile)" },
]

async function monday<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: MONDAY_TOKEN! },
    body: JSON.stringify({ query, variables }),
  })
  const body = (await res.json()) as { data?: T; errors?: Array<{ message: string }> }
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "))
  if (!body.data) throw new Error("no data")
  return body.data
}

async function fetchAllBoardItems(boardId: string): Promise<Array<{ id: string; name: string }>> {
  const first = await monday<{
    boards: Array<{ items_page: { cursor: string | null; items: Array<{ id: string; name: string }> } }> | null
  }>(
    `query ($ids: [ID!], $limit: Int!) {
       boards(ids: $ids) { items_page(limit: $limit) { cursor items { id name } } }
     }`,
    { ids: [boardId], limit: 200 }
  )
  const page = first.boards?.[0]?.items_page
  if (!page) return []
  const items = [...page.items]
  let cursor = page.cursor
  let safety = 0
  while (cursor && safety < 50) {
    const next = await monday<{
      next_items_page: { cursor: string | null; items: Array<{ id: string; name: string }> }
    }>(
      `query ($cursor: String!, $limit: Int!) {
         next_items_page(cursor: $cursor, limit: $limit) { cursor items { id name } }
       }`,
      { cursor, limit: 200 }
    )
    items.push(...next.next_items_page.items)
    cursor = next.next_items_page.cursor
    safety += 1
  }
  return items
}

async function step1_fixBindings() {
  console.log("\n=== STEP 1: Rebind tenants to real Monday board IDs ===")
  for (const b of FIXED_BINDINGS) {
    const { data, error } = await admin
      .from("byred_tenants")
      .update({ monday_board_id: b.boardId } as never)
      .ilike("name", b.matchLike)
      .select("id, name, monday_board_id")
    if (error) {
      console.error(`  ✗ ${b.label}: ${error.message}`)
      continue
    }
    const rows = (data ?? []) as Array<{ id: string; name: string; monday_board_id: string | null }>
    if (rows.length === 0) {
      console.warn(`  ⚠ ${b.label}: no tenant matched pattern ${b.matchLike}`)
    } else {
      for (const r of rows) {
        console.log(`  ✓ ${b.label}: bound "${r.name}" → ${r.monday_board_id}`)
      }
    }
  }
}

type TenantRow = { id: string; name: string; monday_board_id: string | null; active: boolean | null }

async function step2_pullSync() {
  console.log("\n=== STEP 2: Pull sync (mirror lib/monday/pull-sync.ts) ===")
  const { data } = await admin
    .from("byred_tenants")
    .select("id, name, active, monday_board_id")
    .not("monday_board_id", "is", null)
    .eq("active", true)
  const bindings = (data ?? []) as TenantRow[]

  const totals = { boardItems: 0, inserted: 0, updated: 0, unchanged: 0, errors: 0, reassigned: 0 }

  for (const t of bindings) {
    if (!t.monday_board_id) continue
    console.log(`\n  [${t.name}] board=${t.monday_board_id}`)
    let items: Array<{ id: string; name: string }> = []
    try {
      items = await fetchAllBoardItems(t.monday_board_id)
    } catch (e) {
      console.error(`    ✗ Monday fetch failed: ${e instanceof Error ? e.message : String(e)}`)
      totals.errors += 1
      continue
    }
    console.log(`    Monday returned ${items.length} items`)
    totals.boardItems += items.length
    if (items.length === 0) continue

    const ids = items.map((i) => String(i.id))
    const { data: existingRows, error: fetchErr } = await admin
      .from("byred_tasks")
      .select("id, title, monday_item_id, tenant_id")
      .in("monday_item_id", ids)

    if (fetchErr) {
      console.error(`    ✗ task lookup: ${fetchErr.message}`)
      totals.errors += 1
      continue
    }

    const existing = new Map<string, { id: string; title: string; tenant_id: string }>()
    for (const r of (existingRows ?? []) as Array<{
      id: string
      title: string
      monday_item_id: string | null
      tenant_id: string
    }>) {
      if (r.monday_item_id) existing.set(String(r.monday_item_id), { id: r.id, title: r.title, tenant_id: r.tenant_id })
    }

    let inserted = 0
    let updated = 0
    let unchanged = 0
    let reassigned = 0
    let errors = 0
    const now = new Date().toISOString()

    for (const item of items) {
      const mid = String(item.id)
      const clean = item.name.trim() || "(untitled)"
      const hit = existing.get(mid)
      if (hit) {
        const titleSame = hit.title.trim() === clean
        const tenantSame = hit.tenant_id === t.id
        if (titleSame && tenantSame) {
          unchanged += 1
          continue
        }
        if (!tenantSame) reassigned += 1
        const { error: upErr } = await admin
          .from("byred_tasks")
          .update({ title: clean, tenant_id: t.id, updated_at: now } as never)
          .eq("id", hit.id)
        if (upErr) {
          console.error(`    ✗ update ${hit.id}: ${upErr.message}`)
          errors += 1
        } else updated += 1
        continue
      }
      const { error: insErr } = await admin
        .from("byred_tasks")
        .insert({ tenant_id: t.id, title: clean, monday_item_id: mid } as never)
      if (insErr) {
        console.error(`    ✗ insert ${mid}: ${insErr.message}`)
        errors += 1
      } else inserted += 1
    }
    console.log(`    inserted=${inserted} updated=${updated} reassigned=${reassigned} unchanged=${unchanged} errors=${errors}`)
    totals.inserted += inserted
    totals.updated += updated
    totals.unchanged += unchanged
    totals.errors += errors
    totals.reassigned += reassigned
  }

  console.log(`\n  TOTALS: ${JSON.stringify(totals)}`)
}

async function step3_verify() {
  console.log("\n=== STEP 3: Post-sync task distribution ===")
  const { data: tenants } = await admin
    .from("byred_tenants")
    .select("id, name, monday_board_id")
    .order("name", { ascending: true })
  const { data: tasks } = await admin
    .from("byred_tasks")
    .select("id, tenant_id, title, monday_item_id")

  const tenantRows = (tenants ?? []) as Array<{ id: string; name: string; monday_board_id: string | null }>
  const taskRows = (tasks ?? []) as Array<{ id: string; tenant_id: string; title: string; monday_item_id: string | null }>

  for (const t of tenantRows) {
    const ts = taskRows.filter((x) => x.tenant_id === t.id)
    const linked = ts.filter((x) => x.monday_item_id).length
    console.log(`  ${t.name}  board=${t.monday_board_id ?? "—"}  total=${ts.length}  linked=${linked}`)
  }
  console.log(`\n  grand total tasks: ${taskRows.length}`)
}

async function main() {
  await step1_fixBindings()
  await step2_pullSync()
  await step3_verify()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
