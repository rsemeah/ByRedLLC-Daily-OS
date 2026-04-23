import { NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { pullAllMondayBoardsIntoTasks } from "@/lib/monday/pull-sync"

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
  const requestId =
    req.headers.get("x-vercel-id") ??
    req.headers.get("x-request-id") ??
    crypto.randomUUID()

  if (!authorizeCron(req)) {
    console.warn(
      JSON.stringify({
        event: "monday_sync.unauthorized",
        request_id: requestId,
      })
    )
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  try {
    const batch = await pullAllMondayBoardsIntoTasks()
    const durationMs = Date.now() - startedAt

    console.info(
      JSON.stringify({
        event: "monday_sync.ok",
        request_id: requestId,
        duration_ms: durationMs,
        tenants: batch.tenants,
        totals: batch.totals,
      })
    )

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
    console.error(
      JSON.stringify({
        event: "monday_sync.failed",
        request_id: requestId,
        duration_ms: durationMs,
        error: message,
      })
    )
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export function POST(request: Request) {
  return run(request)
}

export function GET(request: Request) {
  return run(request)
}
