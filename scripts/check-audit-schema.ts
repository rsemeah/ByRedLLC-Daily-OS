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

  // Inspect by trying to select and inspect a known row's ids
  const { data: anyAct, error: e1 } = await admin
    .from("byred_activities")
    .select("id, tenant_id, object_id, object_type")
    .limit(5)
  console.log("activities sample:", e1 ?? anyAct)

  const { data: tenants, error: e2 } = await admin
    .from("byred_tenants")
    .select("id, name")
    .order("name")
  console.log("\ntenants:")
  for (const r of (tenants ?? []) as Array<{ id: string; name: string }>) {
    console.log(`  id=${r.id}  len=${r.id.length}  name=${r.name}`)
  }
  if (e2) console.error(e2)

  // Check byred_tasks rows for tenant_id column type — sample from working inserts
  const { data: tasks } = await admin
    .from("byred_tasks")
    .select("id, tenant_id, title, monday_item_id")
    .eq("monday_item_id", "11741132215")
    .limit(1)
  console.log("\ntask sample:", tasks)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
