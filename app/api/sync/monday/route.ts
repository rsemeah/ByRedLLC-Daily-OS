import { NextResponse } from "next/server"
import { pullMondayBoardIntoTasks } from "@/lib/monday/pull-sync"

export const maxDuration = 120

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  return req.headers.get("authorization") === `Bearer ${secret}`
}

/**
 * Pull every item on the configured Monday board and reconcile `byred_tasks`.
 * Linked → UPDATE title on drift. Unlinked + `MONDAY_SYNC_TENANT_ID` → INSERT.
 * Requires `MONDAY_API_KEY` + service role + Supabase.
 *
 * Auth: `Authorization: Bearer ${CRON_SECRET}` (Vercel Cron sets this automatically
 * when `CRON_SECRET` is a project env var). POST for manual triggers; GET for Vercel cron.
 */
async function run(req: Request): Promise<NextResponse> {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  try {
    const summary = await pullMondayBoardIntoTasks()
    return NextResponse.json({
      ok: true,
      ...summary,
      message: "Pulled Monday board items into byred_tasks (upsert).",
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Monday board pull failed."
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export function POST(request: Request) {
  return run(request)
}

export function GET(request: Request) {
  return run(request)
}
