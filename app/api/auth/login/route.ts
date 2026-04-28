import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { rateLimitLogin } from "@/lib/rate-limit"
import { correlationId, logger } from "@/lib/observability/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
})

function clientIp(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  )
}

export async function POST(req: Request) {
  const log = logger.child({
    component: "auth_login",
    request_id: correlationId(req),
  })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid credentials shape." },
      { status: 400 }
    )
  }

  const ip = clientIp(req)
  const gate = await rateLimitLogin({ email: parsed.data.email, ip })

  if (!gate.allowed) {
    log.warn("rate_limited", {
      email_len: parsed.data.email.length,
      ip,
      retry_after_s: gate.retryAfterSeconds,
    })
    return NextResponse.json(
      {
        error: `Too many login attempts. Try again in ${gate.retryAfterSeconds} seconds.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(gate.retryAfterSeconds),
        },
      }
    )
  }

  // Allowlist gate — BYRED_INTERNAL_EMAILS env var (comma-separated)
  const allowlist = process.env.BYRED_INTERNAL_EMAILS
  if (allowlist) {
    const allowed = allowlist
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
    if (allowed.length > 0 && !allowed.includes(parsed.data.email)) {
      log.warn("allowlist_rejected", { email_len: parsed.data.email.length })
      return NextResponse.json(
        { error: "Access restricted. Contact your administrator." },
        { status: 403 }
      )
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    log.info("auth_rejected", { reason: error.message })
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    )
  }

  log.info("ok")
  return NextResponse.json({ ok: true })
}
