import { NextResponse } from "next/server"
import { runGlobalDailyBriefGeneration } from "@/lib/daily-brief/generate-global-brief"

export const maxDuration = 120

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = req.headers.get("authorization")
  return auth === `Bearer ${secret}`
}

/**
 * Scheduled global daily brief (Groq → `byred_daily_briefs`, `user_id` null).
 * Protect with Authorization: Bearer CRON_SECRET (Vercel Cron when CRON_SECRET is set).
 */
export async function GET(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const result = await runGlobalDailyBriefGeneration()

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    date: result.date,
    message: "Daily brief saved.",
  })
}
