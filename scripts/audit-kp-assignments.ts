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

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ─── Directory (all byred_users) ──────────────────────────────────────
  const { data: users } = await s
    .from("byred_users")
    .select("id, name, email, auth_user_id, monday_user_id, active, role")
    .order("name")
  console.log("\n=== Directory (byred_users) ===")
  console.table(users)

  // ─── Find KP specifically ─────────────────────────────────────────────
  const kp = (users ?? []).find(
    (u: { email: string; name: string }) =>
      u.email?.toLowerCase() === "clashon64@gmail.com" ||
      u.name?.toLowerCase().includes("keymon") ||
      u.name?.toLowerCase().includes("kp")
  ) as { id: string; name: string; monday_user_id: string | null } | undefined

  if (!kp) {
    console.log("\n⚠️  Could not locate a byred_users row for Keymon Penn.")
    return
  }
  console.log(`\n=== Focus user: ${kp.name} ===`)
  console.log(`  byred_users.id:    ${kp.id}`)
  console.log(`  monday_user_id:    ${kp.monday_user_id ?? "(not linked)"}`)

  // ─── Task counts by owner across all tenants ─────────────────────────
  const { data: tenants } = await s
    .from("byred_tenants")
    .select("id, name, active")
    .eq("active", true)
    .order("name")

  console.log("\n=== KP's tasks per board ===")
  const perBoard = []
  let kpTotal = 0
  for (const t of (tenants ?? []) as Array<{ id: string; name: string }>) {
    const { count } = await s
      .from("byred_tasks")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", t.id)
      .eq("owner_user_id", kp.id)
      .is("archived_at", null)
    perBoard.push({ tenant: t.name, kp_tasks: count ?? 0 })
    kpTotal += count ?? 0
  }
  console.table(perBoard)
  console.log(`KP total owned tasks (live): ${kpTotal}`)

  // ─── Unassigned tasks ─────────────────────────────────────────────────
  const { count: unassigned } = await s
    .from("byred_tasks")
    .select("id", { count: "exact", head: true })
    .is("owner_user_id", null)
    .is("archived_at", null)
  console.log(`\nUnassigned tasks (live, all boards): ${unassigned ?? 0}`)

  // ─── Top owners (who has what across boards) ──────────────────────────
  const { data: allTasks } = await s
    .from("byred_tasks")
    .select("owner_user_id")
    .is("archived_at", null)
  const counts = new Map<string, number>()
  for (const r of (allTasks ?? []) as Array<{ owner_user_id: string | null }>) {
    const k = r.owner_user_id ?? "(unassigned)"
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const nameById = new Map(
    ((users ?? []) as Array<{ id: string; name: string }>).map((u) => [u.id, u.name])
  )
  const ownerReport = [...counts.entries()]
    .map(([id, n]) => ({ owner: id === "(unassigned)" ? id : nameById.get(id) ?? id, owner_id: id, tasks: n }))
    .sort((a, b) => b.tasks - a.tasks)
  console.log("\n=== Owner distribution ===")
  console.table(ownerReport)

  // ─── Monday linkage check ─────────────────────────────────────────────
  const unlinked = ((users ?? []) as Array<{ name: string; monday_user_id: string | null; active: boolean }>)
    .filter((u) => u.active && !u.monday_user_id)
  if (unlinked.length > 0) {
    console.log("\n⚠️  Active users without monday_user_id (Monday sync will not map them):")
    console.table(unlinked.map((u) => ({ name: u.name })))
  } else {
    console.log("\n✓ All active users linked to Monday")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
