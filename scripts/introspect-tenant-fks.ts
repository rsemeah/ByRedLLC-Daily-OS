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

  // Enumerate every byred_* table and sample one row to see tenant_id presence + type-by-value.
  const tables = [
    "byred_tenants",
    "byred_users",
    "byred_user_tenants",
    "byred_tasks",
    "byred_leads",
    "byred_activities",
    "byred_daily_briefs",
    "byred_sync_locks",
  ]
  for (const t of tables) {
    const { data, error } = await admin.from(t).select("*").limit(1)
    if (error) {
      console.log(`  ${t}: ERROR ${error.message}`)
    } else {
      const cols = data?.[0] ? Object.keys(data[0]) : []
      console.log(`  ${t}: cols=${cols.join(",")}`)
    }
  }

  // Count rows in each tenant-bearing table grouped by tenant_id length
  const check = async (table: string) => {
    const { data, error } = await admin
      .from(table)
      .select("tenant_id")
      .limit(5000)
    if (error) {
      console.log(`    ${table}: ${error.message}`)
      return
    }
    const rows = (data ?? []) as Array<{ tenant_id: string | null }>
    const byLen = new Map<number, number>()
    for (const r of rows) {
      if (r.tenant_id) byLen.set(r.tenant_id.length, (byLen.get(r.tenant_id.length) ?? 0) + 1)
    }
    console.log(`    ${table} (${rows.length}): ${[...byLen.entries()].map(([l, c]) => `len${l}=${c}`).join(", ")}`)
  }
  console.log("\nTenant_id shape per table:")
  await check("byred_user_tenants")
  await check("byred_tasks")
  await check("byred_leads")
  await check("byred_activities")

  // Sample the non-uuid ids
  const { data: shortTenants } = await admin
    .from("byred_tenants")
    .select("id, name")
  const rows = (shortTenants ?? []) as Array<{ id: string; name: string }>
  console.log(`\nShort tenant ids:`)
  for (const r of rows) {
    if (r.id.length !== 36) console.log(`  ${r.id} → ${r.name}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
