import { NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { runGlobalDailyBriefGeneration } from "@/lib/daily-brief/generate-global-brief"

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

export async function GET(req: Request) {
  const startedAt = Date.now()
  const requestId =
    req.headers.get("x-vercel-id") ??
    req.headers.get("x-request-id") ??
    crypto.randomUUID()

  if (!authorizeCron(req)) {
    console.warn(
      JSON.stringify({
        event: "daily_brief.unauthorized",
        request_id: requestId,
        ua: req.headers.get("user-agent") ?? null,
      })
    )
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  try {
    const result = await runGlobalDailyBriefGeneration({ requestId })
    const durationMs = Date.now() - startedAt

    if (!result.ok) {
      console.error(
        JSON.stringify({
          event: "daily_brief.failed",
          request_id: requestId,
          duration_ms: durationMs,
          error: result.error,
        })
      )
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 500 }
      )
    }

    console.info(
      JSON.stringify({
        event: "daily_brief.ok",
        request_id: requestId,
        duration_ms: durationMs,
        date: result.date,
        candidates: result.candidates,
        leads_due: result.leadsDue,
        top_3_count: result.top3Count,
      })
    )

    return NextResponse.json({
      ok: true,
      date: result.date,
      candidates: result.candidates,
      leads_due: result.leadsDue,
      top_3_count: result.top3Count,
      duration_ms: durationMs,
    })
  } catch (e) {
    const durationMs = Date.now() - startedAt
    const message = e instanceof Error ? e.message : "Unhandled error."
    console.error(
      JSON.stringify({
        event: "daily_brief.exception",
        request_id: requestId,
        duration_ms: durationMs,
        error: message,
      })
    )
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
