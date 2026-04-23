import { NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { correlationId, logger } from "@/lib/observability/logger"
import { sendAlert } from "@/lib/observability/alerts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const WEBHOOK_RETENTION_DAYS = 7
const SYNC_LOCK_STALE_HOURS = 1

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
 * Daily garbage collection for the observability tables that are not
 * otherwise bounded:
 *
 *   byred_webhook_events — retains 7 days of Monday event dedup keys.
 *     Older keys cannot dedup anyway (Monday retries within a few minutes),
 *     so purging them keeps the table small without opening a replay window.
 *
 *   byred_sync_locks — defensive cleanup of stale rows whose owner crashed
 *     without calling release_sync_lock. Normal TTL handling in
 *     byred_try_sync_lock already steals expired rows, but rows with
 *     `expires_at > now()` from crashed holders would otherwise linger for
 *     the full TTL; rows older than 1 hour are almost always abandoned.
 *
 * Returns per-table counts so the response is greppable in Vercel logs.
 * Same CRON_SECRET auth as /api/sync/monday.
 */
async function run(req: Request): Promise<NextResponse> {
  const startedAt = Date.now()
  const log = logger.child({ component: "cron_gc", request_id: correlationId(req) })

  if (!authorize(req)) {
    log.warn("unauthorized")
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const admin = createAdminClient()

  const webhookCutoff = new Date(
    Date.now() - WEBHOOK_RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()
  const lockCutoff = new Date(
    Date.now() - SYNC_LOCK_STALE_HOURS * 60 * 60 * 1000
  ).toISOString()

  let webhookDeleted = 0
  let lockDeleted = 0
  const errors: string[] = []

  try {
    const { error, count } = await admin
      .from("byred_webhook_events")
      .delete({ count: "exact" })
      .lt("received_at", webhookCutoff)
    if (error) errors.push(`webhook_events: ${error.message}`)
    else webhookDeleted = count ?? 0
  } catch (e) {
    errors.push(
      `webhook_events: ${e instanceof Error ? e.message : String(e)}`
    )
  }

  try {
    const { error, count } = await admin
      .from("byred_sync_locks")
      .delete({ count: "exact" })
      .lt("expires_at", lockCutoff)
    if (error) errors.push(`sync_locks: ${error.message}`)
    else lockDeleted = count ?? 0
  } catch (e) {
    errors.push(`sync_locks: ${e instanceof Error ? e.message : String(e)}`)
  }

  const durationMs = Date.now() - startedAt

  if (errors.length > 0) {
    log.error("failed", {
      duration_ms: durationMs,
      webhook_deleted: webhookDeleted,
      lock_deleted: lockDeleted,
      errors,
    })
    await sendAlert({
      event: "cron_gc.failed",
      severity: "warn",
      message: `GC cron finished with ${errors.length} errors`,
      context: { errors, webhook_deleted: webhookDeleted, lock_deleted: lockDeleted },
    })
    return NextResponse.json(
      {
        ok: false,
        webhook_deleted: webhookDeleted,
        lock_deleted: lockDeleted,
        errors,
        duration_ms: durationMs,
      },
      { status: 500 }
    )
  }

  log.info("ok", {
    duration_ms: durationMs,
    webhook_deleted: webhookDeleted,
    lock_deleted: lockDeleted,
  })
  return NextResponse.json({
    ok: true,
    webhook_deleted: webhookDeleted,
    lock_deleted: lockDeleted,
    duration_ms: durationMs,
  })
}

export function GET(req: Request) {
  return run(req)
}

export function POST(req: Request) {
  return run(req)
}
