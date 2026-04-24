import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { rateLimit } from "@/lib/rate-limit"
import { correlationId, logger } from "@/lib/observability/logger"
import { sendMail } from "@/lib/email/send"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
})

function clientIp(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  )
}

function publicOrigin(req: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (envUrl) return envUrl.replace(/\/$/, "")
  const proto = req.headers.get("x-forwarded-proto") ?? "https"
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    new URL(req.url).host
  return `${proto}://${host}`
}

function renderRecoveryEmail(link: string): { html: string; text: string } {
  const text = [
    "Reset your By Red password",
    "",
    "Use the link below within 60 minutes to choose a new password:",
    link,
    "",
    "If you did not request this, you can ignore this email. Your password will not change.",
    "",
    "— By Red, LLC.",
  ].join("\n")

  const html = `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#fafaf9;margin:0;padding:32px 0;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:8px;overflow:hidden;">
    <div style="background:#09090b;padding:24px;text-align:center;">
      <div style="color:#fafaf9;font-size:14px;font-weight:600;letter-spacing:0.2em;">BY RED, LLC.</div>
    </div>
    <div style="padding:32px 32px 24px;">
      <h1 style="margin:0 0 16px;font-size:20px;color:#18181b;">Reset your password</h1>
      <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6;">
        We received a request to reset the password on your By Red account.
        Click the button below within 60 minutes to pick a new one.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${link}" style="display:inline-block;background:#c8102e;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:14px;">Choose a new password</a>
      </div>
      <p style="margin:0 0 8px;color:#71717a;font-size:12px;">If the button does not work, paste this link into your browser:</p>
      <p style="margin:0 0 24px;word-break:break-all;"><a href="${link}" style="color:#c8102e;font-size:12px;">${link}</a></p>
      <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.5;border-top:1px solid #e7e5e4;padding-top:16px;">
        If you did not request this, ignore this email. Your password will not change.
      </p>
    </div>
  </div>
</body></html>`

  return { html, text }
}

/**
 * Enterprise password-recovery endpoint.
 *
 *  1. Rate-limited on (email, ip) so an attacker cannot probe or spam
 *     reset emails to a victim's inbox.
 *  2. Uses Supabase admin `generateLink({ type: 'recovery' })` to mint a
 *     token_hash. Email is sent via our own transport (Resend), not
 *     Supabase's default SMTP — delivery is no longer a mystery.
 *  3. Returns 200 for all requests regardless of whether the email exists;
 *     this prevents user enumeration.
 *  4. Link points at `/auth/callback?token_hash=…&type=recovery` so the
 *     callback can `verifyOtp` without a PKCE code_verifier cookie —
 *     recovery works even if the user opens the email on a different
 *     device or browser.
 */
export async function POST(req: Request) {
  const log = logger.child({
    component: "auth_forgot_password",
    request_id: correlationId(req),
  })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid email." },
      { status: 400 }
    )
  }

  const email = parsed.data.email
  const ip = clientIp(req) ?? "unknown"

  const gate = await rateLimit({
    key: `forgot:${email}:${ip}`,
    maxEvents: 3,
    windowSeconds: 900,
  })

  if (!gate.allowed) {
    log.warn("rate_limited", { email, ip, retry_after: gate.retryAfterSeconds })
    return NextResponse.json(
      { error: "Too many reset requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSeconds) } }
    )
  }

  const origin = publicOrigin(req)
  const redirectTo = `${origin}/auth/callback?next=/reset-password`

  try {
    const admin = createAdminClient()
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    })

    if (error) {
      // Supabase returns "User not found" for unknown emails. Treat as a
      // non-event — never leak existence. Log it for ops visibility.
      log.info("generate_link_noop", { email, reason: error.message })
      return NextResponse.json({ ok: true })
    }

    const hashedToken = data.properties?.hashed_token
    if (!hashedToken) {
      log.error("missing_hashed_token", { email })
      return NextResponse.json({ ok: true })
    }

    // Build our own link that routes through the app's callback so we
    // control the session-issue step (verifyOtp, not code exchange).
    const resetUrl = new URL(`${origin}/auth/callback`)
    resetUrl.searchParams.set("token_hash", hashedToken)
    resetUrl.searchParams.set("type", "recovery")
    resetUrl.searchParams.set("next", "/reset-password")
    const link = resetUrl.toString()

    const { html, text } = renderRecoveryEmail(link)
    const sent = await sendMail({
      to: email,
      subject: "Reset your By Red password",
      html,
      text,
    })

    log.info("dispatched", {
      email,
      provider: sent.provider,
      delivered: sent.delivered,
      id: sent.id,
    })

    // Surface delivery state in the response ONLY when the operator has
    // opted into dev-diagnostic mode. In production we always return ok.
    if (process.env.NODE_ENV !== "production" && !sent.delivered) {
      return NextResponse.json({
        ok: true,
        warning:
          "Email not delivered (no transport configured). Check server logs for recovery link.",
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    log.error("exception", { email }, e)
    // Never leak the exception back to the client; the outcome to the
    // user is the same as a successful request: "check your email."
    return NextResponse.json({ ok: true })
  }
}
