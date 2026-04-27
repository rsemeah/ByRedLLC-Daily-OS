import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { pullMondayBoardForTenant } from "@/lib/monday/pull-sync"
import { correlationId, logger } from "@/lib/observability/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Per-tenant Monday pull. User-authenticated (not cron). Scoped to tenant
 * membership — a user who is not a member of `tenantId` gets a 403 even if
 * the tenant exists. Used by the "sync now" button on the board tab so KP
 * can force an immediate refresh without waiting for cron or webhook.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ tenantId: string }> }
) {
  const startedAt = Date.now()
  const requestId = correlationId(req)
  const { tenantId } = await ctx.params
  const log = logger.child({
    component: "monday_sync_tenant",
    request_id: requestId,
    tenant_id: tenantId,
  })

  let user
  try {
    user = await requireAuth()
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const inScope = user.tenants.some((t) => t.id === tenantId)
  if (!inScope) {
    log.warn("forbidden", { user_id: user.authUser.id })
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const url = new URL(req.url)
  const forceFull =
    url.searchParams.get("full") === "1" ||
    url.searchParams.get("full") === "true"

  try {
    const result = await pullMondayBoardForTenant(tenantId, { forceFull })
    const durationMs = Date.now() - startedAt

    if (!result) {
      log.warn("no_binding", { duration_ms: durationMs })
      return NextResponse.json(
        { ok: false, error: "Tenant has no Monday board bound." },
        { status: 400 }
      )
    }

    if (result.skipped) {
      log.warn("skipped_locked", {
        duration_ms: durationMs,
        reason: result.skippedReason,
      })
      return NextResponse.json(
        {
          ok: false,
          error: result.skippedReason ?? "Sync already in progress.",
          duration_ms: durationMs,
        },
        { status: 409 }
      )
    }

    log.info("ok", { duration_ms: durationMs, force_full: forceFull, result })
    return NextResponse.json({ ok: true, duration_ms: durationMs, ...result })
  } catch (e) {
    const durationMs = Date.now() - startedAt
    log.error("failed", { duration_ms: durationMs }, e)
    const message = e instanceof Error ? e.message : "Monday sync failed."
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
