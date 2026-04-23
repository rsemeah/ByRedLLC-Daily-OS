import { NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { pullAllMondayBoardsIntoTasks } from "@/lib/monday/pull-sync"
import { sendAlert } from "@/lib/observability/alerts"
import { correlationId, logger } from "@/lib/observability/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const header = req.headers.get("authorization") ?? ""
  const expected = `Bearer ${secret}`
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Multi-tenant Monday pull. Iterates every `byred_tenants` row with a
 * `monday_board_id`, pulls that board, reconciles into `byred_tasks` scoped
 * to the owning tenant. Returns per-tenant + aggregate counters for cron logs.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` (constant-time compared).
 */
async function run(req: Request): Promise<NextResponse> {
  const startedAt = Date.now()
  const requestId = correlationId(req)
  const log = logger.child({ component: "monday_sync", request_id: requestId })

  if (!authorizeCron(req)) {
    log.warn("unauthorized")
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const url = new URL(req.url)
  const forceFull =
    url.searchParams.get("full") === "1" ||
    url.searchParams.get("full") === "true" ||
    req.headers.get("x-byred-sync-mode")?.toLowerCase() === "full"

  try {
    const batch = await pullAllMondayBoardsIntoTasks({ forceFull })
    const durationMs = Date.now() - startedAt

    log.info("ok", {
      duration_ms: durationMs,
      force_full: forceFull,
      tenants: batch.tenants,
      totals: batch.totals,
    })

    if (batch.totals.errors > 0) {
      await sendAlert({
        event: "monday_sync.partial_failure",
        severity: "warn",
        message: `Monday sync finished with ${batch.totals.errors} errors (${batch.tenants} tenants)`,
        context: {
          request_id: requestId,
          totals: batch.totals,
          per_tenant_errors: batch.results
            .filter((r) => r.errors > 0)
            .map((r) => ({ tenant: r.tenantName, board: r.boardId, errors: r.errors })),
        },
      })
    }

    return NextResponse.json({
      ok: true,
      tenants: batch.tenants,
      totals: batch.totals,
      results: batch.results,
      duration_ms: durationMs,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Monday board pull failed."
    const durationMs = Date.now() - startedAt
    log.error("failed", { duration_ms: durationMs }, e)
    await sendAlert({
      event: "monday_sync.failed",
      severity: "error",
      message: `Monday sync threw: ${message}`,
      context: { request_id: requestId, duration_ms: durationMs },
    })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export function POST(request: Request) {
  return run(request)
}

export function GET(request: Request) {
  return run(request)
}
