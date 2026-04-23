import { NextResponse } from "next/server"
import { processMondayWebhookPayload } from "@/lib/monday/webhook-process"

export const maxDuration = 60

function verifyWebhookCaller(req: Request): boolean {
  const secret = process.env.MONDAY_WEBHOOK_SECRET?.trim()
  if (!secret) return true

  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  const legacy = req.headers.get("x-monday-webhook-token") ?? ""
  return auth === secret || legacy === secret
}

/**
 * Monday.com outbound webhooks (board events).
 *
 * — **Challenge:** Monday sends `{ "challenge": "..." }` once when creating the webhook;
 *   respond with the same JSON so Monday can validate the URL.
 * — **Events:** When `MONDAY_WEBHOOK_SECRET` is set, incoming calls must send that value
 *   as `Authorization: Bearer <secret>` or `x-monday-webhook-token`.
 */
export async function POST(req: Request) {
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

  const challenge = body.challenge
  if (typeof challenge === "string") {
    return NextResponse.json({ challenge })
  }

  if (!verifyWebhookCaller(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const result = await processMondayWebhookPayload(body)

  return NextResponse.json({
    ok: true,
    pulseId: result.pulseId,
    action: result.action,
    updated: result.updated,
    detail: result.reason ?? null,
  })
}

export function GET() {
  return NextResponse.json({
    ok: true,
    hint: "Monday sends POST JSON (challenge on subscribe, then events).",
  })
}
