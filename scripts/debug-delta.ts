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

const MONDAY_TOKEN = (process.env.MONDAY_API_KEY ?? process.env.MONDAY_TOKEN ?? "").trim()
if (!MONDAY_TOKEN) { console.error("Missing MONDAY_API_KEY or MONDAY_TOKEN"); process.exit(1) }

async function monday<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: MONDAY_TOKEN },
    body: JSON.stringify({ query, variables }),
  })
  const body = (await res.json()) as { data?: T; errors?: Array<{ message: string }> }
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "))
  return body.data!
}

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: cursors } = await admin
    .from("byred_board_sync_cursors")
    .select("tenant_id, board_id, cursor_updated_at, last_full_sync_at, last_delta_sync_at")
    .order("board_id", { ascending: true })

  for (const c of (cursors ?? []) as Array<{
    tenant_id: string
    board_id: string
    cursor_updated_at: string | null
    last_full_sync_at: string | null
  }>) {
    const data = await monday<{
      boards: Array<{ items_page: { items: Array<{ id: string; updated_at: string | null; name: string }> } }> | null
    }>(
      `query ($ids: [ID!], $limit: Int!) {
         boards(ids: $ids) { items_page(limit: $limit) { items { id name updated_at } } }
       }`,
      { ids: [c.board_id], limit: 500 }
    )
    const items = data.boards?.[0]?.items_page.items ?? []
    const cursor = c.cursor_updated_at
    const newerThanCursor = cursor ? items.filter((i) => i.updated_at && i.updated_at > cursor) : items
    const maxUpdated = items.reduce<string | null>(
      (a, i) => (i.updated_at && (!a || i.updated_at > a) ? i.updated_at : a),
      null
    )
    console.log(
      `board=${c.board_id}  total=${items.length}  cursor=${cursor?.slice(0, 19) ?? "—"}  max_on_board=${maxUpdated?.slice(0, 19) ?? "—"}  strictly_newer=${newerThanCursor.length}`
    )
    if (newerThanCursor.length > 0 && newerThanCursor.length <= 5) {
      for (const i of newerThanCursor) {
        console.log(`    ↳ ${i.id}  ${i.updated_at}  "${i.name.slice(0, 40)}"`)
      }
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
