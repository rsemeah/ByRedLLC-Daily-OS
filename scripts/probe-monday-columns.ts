// Read-only probe of every bound board's column schema.
// Answers: which column on each board holds the assignee (People), the status,
// the date/timeline, and the priority. If there's exactly one candidate per
// kind, auto-mapping is safe. If multiple, we surface them so KP can pick.

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
} catch {}

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const MONDAY_TOKEN =
  (process.env.MONDAY_API_KEY?.trim() || process.env.MONDAY_TOKEN?.trim())!

const admin = createClient(SB_URL, SB_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type BoardColumn = { id: string; title: string; type: string }

async function monday<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: MONDAY_TOKEN },
    body: JSON.stringify({ query, variables }),
  })
  const body = (await res.json()) as { data?: T; errors?: Array<{ message: string }> }
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "))
  if (!body.data) throw new Error("no data")
  return body.data
}

function pickCandidates(columns: BoardColumn[]) {
  const byType: Record<string, BoardColumn[]> = {
    status: columns.filter((c) => c.type === "status" || c.type === "color"),
    date: columns.filter((c) => c.type === "date"),
    timeline: columns.filter((c) => c.type === "timeline" || c.type === "timerange"),
    people: columns.filter((c) => c.type === "people" || c.type === "multiple-person"),
    priority: columns.filter(
      (c) =>
        c.type === "priority" ||
        c.id.toLowerCase().includes("priority") ||
        c.title.toLowerCase().includes("priority")
    ),
  }
  return byType
}

async function main() {
  const { data: tenants } = await admin
    .from("byred_tenants")
    .select("id, name, monday_board_id")
    .not("monday_board_id", "is", null)
    .eq("active", true)
    .order("name", { ascending: true })

  const boards = ((tenants ?? []) as Array<{
    id: string
    name: string
    monday_board_id: string
  }>).filter((t) => t.monday_board_id)

  console.log(`Probing ${boards.length} bound boards...\n`)

  for (const t of boards) {
    const resp = await monday<{
      boards: Array<{ columns: BoardColumn[] }> | null
    }>(
      `
      query ($ids: [ID!]) {
        boards(ids: $ids) {
          columns { id title type }
        }
      }
    `,
      { ids: [t.monday_board_id] }
    )
    const cols = resp.boards?.[0]?.columns ?? []
    const picks = pickCandidates(cols)

    console.log(`=== ${t.name} (${t.monday_board_id}) ===`)
    for (const [kind, list] of Object.entries(picks)) {
      if (list.length === 0) {
        console.log(`  ${kind.padEnd(8)}: (none)`)
      } else if (list.length === 1) {
        const c = list[0]
        console.log(`  ${kind.padEnd(8)}: ${c.id}  "${c.title}"  [${c.type}]  ✓ auto`)
      } else {
        console.log(`  ${kind.padEnd(8)}: AMBIGUOUS (${list.length}):`)
        for (const c of list) {
          console.log(`              ${c.id}  "${c.title}"  [${c.type}]`)
        }
      }
    }
    console.log("")
  }

  // Also pull the users visible to this token so we can preview who maps to whom.
  console.log(`=== Monday users visible to this token ===`)
  const users = await monday<{
    users: Array<{ id: string; name: string; email: string; photo_original: string | null; enabled: boolean }>
  }>(`
    query {
      users(limit: 200) {
        id
        name
        email
        photo_original
        enabled
      }
    }
  `)
  console.log(`Found ${users.users.length} users`)

  const { data: byred } = await admin
    .from("byred_users")
    .select("id, name, email, avatar_url")
  const byredByEmail = new Map(
    ((byred ?? []) as Array<{ id: string; name: string; email: string; avatar_url: string | null }>).map((u) => [
      u.email.toLowerCase(),
      u,
    ])
  )

  let matched = 0
  let orphans = 0
  const orphanSample: Array<{ email: string; name: string }> = []
  for (const mu of users.users) {
    const hit = byredByEmail.get(mu.email.toLowerCase())
    if (hit) matched += 1
    else {
      orphans += 1
      if (orphanSample.length < 10) orphanSample.push({ email: mu.email, name: mu.name })
    }
  }
  console.log(`  matched to byred_users by email: ${matched}`)
  console.log(`  monday users with no byred_user match: ${orphans}`)
  if (orphanSample.length > 0) {
    console.log(`  first ${orphanSample.length}:`)
    for (const o of orphanSample) {
      console.log(`    ${o.email}  "${o.name}"`)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
