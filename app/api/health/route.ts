import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assessEnv } from "@/lib/env"
import { correlationId, logger } from "@/lib/observability/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// Short — if the DB doesn't respond quickly, the uptime monitor should trip.
export const maxDuration = 10

type CheckResult = {
  ok: boolean
  latencyMs: number
  error?: string
}

async function checkDatabase(): Promise<CheckResult> {
  const startedAt = Date.now()
  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from("byred_tenants")
      .select("id", { count: "exact", head: true })
      .limit(1)
    if (error) {
      return { ok: false, latencyMs: Date.now() - startedAt, error: error.message }
    }
    return { ok: true, latencyMs: Date.now() - startedAt }
  } catch (e) {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

/**
 * Uptime + readiness endpoint.
 *
 * Returns 200 only when every required env var is present AND the database
 * responds inside the maxDuration budget. Otherwise 503 — a monitoring probe
 * (Vercel, UptimeRobot, etc.) alerts on non-200. Never leaks secret values.
 */
export async function GET(req: Request) {
  const log = logger.child({ component: "health", request_id: correlationId(req) })

  const envReport = assessEnv()
  const db = await checkDatabase()
  const ok = envReport.ok && db.ok

  const body = {
    status: ok ? "ok" : "degraded",
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    region: process.env.VERCEL_REGION ?? "local",
    checks: {
      env: envReport.ok
        ? { ok: true }
        : {
            ok: false,
            missing: envReport.missing.map((item) => item.name),
          },
      database: db,
    },
  }

  if (!ok) {
    log.warn("degraded", body)
    return NextResponse.json(body, { status: 503 })
  }

  log.debug("ok", body)
  return NextResponse.json(body)
}
