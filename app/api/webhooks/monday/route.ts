import { NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { processMondayWebhookPayload } from "@/lib/monday/webhook-process"
import {
  annotateWebhookEvent,
  recordWebhookEvent,
} from "@/lib/monday/webhook-dedup"

export const runtime = "nodejs"
export const maxDuration = 60
export const dynamic = "force-dynamic"

type AuthResult =
  | { ok: true }
  | { ok: false; status: number; reason: string }

function verifyWebhookCaller(req: Request): AuthResult {
  const secret = process.env.MONDAY_WEBHOOK_SECRET?.trim()

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        status: 503,
        reason: "MONDAY_WEBHOOK_SECRET not configured; refusing to accept webhook events.",
      }
    }
    // In dev, allow unsigned so local tunnels work without forcing every dev
    // to set the env. Production must fail closed.
    return { ok: true }
  }

  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? ""
  const legacy = req.headers.get("x-monday-webhook-token")?.trim() ?? ""
  const candidate = auth || legacy

  if (!candidate) {
    return { ok: false, status: 401, reason: "Missing webhook auth header." }
  }

  const a = Buffer.from(candidate)
  const b = Buffer.from(secret)
  if (a.length !== b.length) {
    return { ok: false, status: 401, reason: "Webhook auth mismatch." }
  }
  if (!timingSafeEqual(a, b)) {
    return { ok: false, status: 401, reason: "Webhook auth mismatch." }
  }
  return { ok: true }
}

/**
 * Monday.com outbound webhooks (board events).
 *
 * Challenge: Monday sends `{ "challenge": "..." }` once when creating the
 * webhook; respond with the same JSON so Monday can validate the URL.
 * Challenge is answered BEFORE auth so subscription setup works even before
 * the secret is wired up.
 *
 * Events: when `MONDAY_WEBHOOK_SECRET` is set, the caller must present it as
 * `Authorization: Bearer <secret>` or `x-monday-webhook-token`. Compare is
 * timing-safe. In production, a missing secret fails closed with 503.
 */
export async function POST(req: Request) {
  const requestId =
    req.headers.get("x-vercel-id") ??
    req.headers.get("x-request-id") ??
    crypto.randomUUID()

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: "Expected JSON body." }, { status: 400 })
  }

  const body =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null
  if (!body) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 })
  }

  // Challenge handshake comes first — Monday has not yet been given the
  // secret when it creates the subscription.
  const challenge = body.challenge
  if (typeof challenge === "string") {
    console.info(
      JSON.stringify({
        event: "monday_webhook.challenge",
        request_id: requestId,
      })
    )
    return NextResponse.json({ challenge })
  }

  const auth = verifyWebhookCaller(req)
  if (!auth.ok) {
    console.warn(
      JSON.stringify({
        event: "monday_webhook.unauthorized",
        request_id: requestId,
        reason: auth.reason,
      })
    )
    return NextResponse.json({ error: auth.reason }, { status: auth.status })
  }

  try {
    const dedup = await recordWebhookEvent({ source: "monday", payload: body })

    if (dedup.duplicate) {
      console.info(
        JSON.stringify({
          event: "monday_webhook.duplicate",
          request_id: requestId,
          event_key: dedup.eventKey,
        })
      )
      return NextResponse.json({
        ok: true,
        duplicate: true,
        previousResult: dedup.previousResult ?? null,
      })
    }

    const result = await processMondayWebhookPayload(body)

    await annotateWebhookEvent({
      source: "monday",
      eventKey: dedup.eventKey,
      result: {
        pulseId: result.pulseId,
        boardId: result.boardId,
        tenantId: result.tenantId,
        action: result.action,
        reason: result.reason ?? null,
      },
    })

    console.info(
      JSON.stringify({
        event: "monday_webhook.processed",
        request_id: requestId,
        event_key: dedup.eventKey,
        pulse_id: result.pulseId,
        board_id: result.boardId,
        tenant_id: result.tenantId,
        action: result.action,
        reason: result.reason ?? null,
      })
    )
    return NextResponse.json({
      ok: true,
      pulseId: result.pulseId,
      action: result.action,
      updated: result.updated,
      detail: result.reason ?? null,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error(
      JSON.stringify({
        event: "monday_webhook.failed",
        request_id: requestId,
        error: message,
      })
    )
    // 200 with error body: Monday retries on non-2xx, and we do not want
    // retry storms for a payload we cannot process. The log captures the
    // failure for operators.
    return NextResponse.json({ ok: false, error: message })
  }
}

export function GET() {
  return NextResponse.json({
    ok: true,
    hint: "Monday sends POST JSON (challenge on subscribe, then events).",
  })
}
