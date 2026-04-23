import { NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { syncMondayUsersToByred } from "@/lib/monday/users"
import { correlationId, logger } from "@/lib/observability/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

function authorize(req: Request): boolean {
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
 * Pull every Monday workspace user into byred_users. Idempotent. Same
 * `Bearer ${CRON_SECRET}` auth as /api/sync/monday. Run this once after
 * connecting a new Monday token, then the pull-sync can resolve assignees
 * against the roster automatically.
 */
async function run(req: Request): Promise<NextResponse> {
  const log = logger.child({
    component: "admin_sync_monday_users",
    request_id: correlationId(req),
  })

  if (!authorize(req)) {
    log.warn("unauthorized")
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  try {
    const result = await syncMondayUsersToByred()
    log.info("ok", { ...result })
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    log.error("failed", undefined, e)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export function POST(req: Request) {
  return run(req)
}

export function GET(req: Request) {
  return run(req)
}
