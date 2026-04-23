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

  const { data: existing } = await admin
    .from("byred_activities")
    .select("object_type, type")
    .limit(20)
  console.log("existing activity rows:", existing)

  const probes = [
    "byred_tasks",
    "task",
    "tasks",
    "byred_tenants",
    "tenant",
    "byred_users",
    "user",
    "byred_leads",
    "lead",
    "byred_daily_briefs",
    "daily_brief",
    "byred_user_tenants",
    "user_tenant",
  ]
  const { data: firstTenant } = await admin.from("byred_tenants").select("id").limit(1).single()
  const probeTenantId = (firstTenant as { id: string } | null)?.id ?? "00000000-0000-0000-0000-000000000000"
  console.log("probe tenant_id:", probeTenantId)

  for (const ot of probes) {
    const { error } = await admin.from("byred_activities").insert({
      tenant_id: probeTenantId,
      object_type: ot,
      object_id: "probe",
      type: "audit_created",
      summary: "probe",
    } as never)
    if (!error) {
      console.log(`  ✓ ${ot} — insert succeeded`)
      await admin
        .from("byred_activities")
        .delete()
        .eq("object_id", "probe")
        .eq("object_type", ot)
    } else if (error.message.includes("object_type_check")) {
      console.log(`  ✗ ${ot} — blocked by check`)
    } else {
      console.log(`  ? ${ot} — ${error.message}`)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
