import { NextResponse } from "next/server"
import { pullMondayTitlesIntoTasks } from "@/lib/monday/pull-sync"

export const maxDuration = 120

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  return req.headers.get("authorization") === `Bearer ${secret}`
}

/**
 * Pull-linked sync: updates `byred_tasks.title` from Monday pulse names for rows
 * that already have `monday_item_id`. Requires `MONDAY_API_KEY` + service role + Supabase.
 *
 * **Gate:** `Authorization: Bearer CRON_SECRET` (same pattern as `/api/cron/daily-brief`).
 */
export async function POST(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  try {
    const summary = await pullMondayTitlesIntoTasks()
    return NextResponse.json({
      ok: true,
      ...summary,
      message:
        "Pulled pulse names from Monday into linked tasks (title updates only).",
    })
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Monday pull sync failed."
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
