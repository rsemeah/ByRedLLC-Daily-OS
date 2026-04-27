import { createClient } from "@/lib/supabase/server"
import { requireTenantScope } from "@/lib/data/tenant-scope"
import { calendarDatePacific } from "@/lib/time/pacific-date"
import type { DailyBriefSummary, Json } from "@/types/database"

const DEFAULT_BRIEF: DailyBriefSummary = {
  headline: "No brief generated yet",
  top_3: [],
  warnings: [],
  next_action: "Check back later for your daily brief",
  verification_notes: ["MISSING: No generated brief is stored for today."],
}

export async function getUserBrief(
  profileId: string
): Promise<{ summary: DailyBriefSummary; date: string }> {
  const supabase = await createClient()
  const today = calendarDatePacific()

  const { data, error } = await supabase
    .from("byred_daily_briefs")
    .select("summary, date")
    .eq("date", today)
    .eq("user_id", profileId)
    .maybeSingle()

  if (error || !data) {
    return { summary: DEFAULT_BRIEF, date: today }
  }

  const row = data as { summary: Json; date: string }
  return {
    summary: row.summary as DailyBriefSummary,
    date: row.date,
  }
}

/**
 * Per-user daily brief for the current session. Returns the placeholder when
 * the user has no brief stored for today. Never falls back to a "global"
 * brief: the cron-generated global row aggregates top tasks across every
 * tenant, so exposing it to any signed-in user would leak other tenants'
 * task titles and ids.
 */
export async function getDailyBriefForSession(): Promise<{
  summary: DailyBriefSummary
  date: string
}> {
  const { profileId } = await requireTenantScope()
  if (!profileId) {
    return { summary: DEFAULT_BRIEF, date: calendarDatePacific() }
  }
  return getUserBrief(profileId)
}
