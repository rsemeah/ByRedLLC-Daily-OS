import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const checks: Record<string, string> = {}

  // Check env vars
  checks.supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL ? "ok" : "missing"
  checks.supabase_anon_key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "ok" : "missing"
  checks.supabase_service_role = process.env.SUPABASE_SERVICE_ROLE_KEY ? "ok" : "missing"

  // Check DB connectivity
  try {
    const supabase = await createClient()
    const { error } = await supabase.from("byred_tenants").select("id").limit(1)
    checks.database = error ? `error: ${error.message}` : "ok"
  } catch (e) {
    checks.database = `error: ${e instanceof Error ? e.message : "unknown"}`
  }

  const allOk = Object.values(checks).every((v) => v === "ok")

  return NextResponse.json(
    { status: allOk ? "ok" : "degraded", checks, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 503 }
  )
}
