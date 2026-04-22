import { createClient } from "@/lib/supabase/server"
import { requireTenantScope } from "@/lib/data/tenant-scope"
import { calendarDatePacific } from "@/lib/time/pacific-date"
import type { DailyBriefSummary, Json } from "@/types/database"

const DEFAULT_BRIEF: DailyBriefSummary = {
  headline: "No brief generated yet",
  top_3: [],
  warnings: [],
  next_action: "Check back later for your daily brief",
}

export async function getTodayBrief(): Promise<{
  summary: DailyBriefSummary
  date: string
}> {
  const supabase = await createClient()
  const today = calendarDatePacific()

  const { data, error } = await supabase
    .from("byred_daily_briefs")
    .select("summary, date")
    .eq("date", today)
    .is("user_id", null)
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

export async function getUserBrief(
  profileId: string
): Promise<{ summary: DailyBriefSummary; date: string }> {
  const supabase = await createClient()
  const today = calendarDatePacific()

  const { data: userBrief, error: userErr } = await supabase
    .from("byred_daily_briefs")
    .select("summary, date")
    .eq("date", today)
    .eq("user_id", profileId)
    .maybeSingle()

  if (!userErr && userBrief) {
    const row = userBrief as { summary: Json; date: string }
    return {
      summary: row.summary as DailyBriefSummary,
      date: row.date,
    }
  }

  return getTodayBrief()
}

/**
 * User-specific daily brief when present, otherwise the global brief (for the signed-in user).
 */
export async function getDailyBriefForSession(): Promise<{
  summary: DailyBriefSummary
  date: string
}> {
  const { profileId } = await requireTenantScope()
  if (profileId) {
    return getUserBrief(profileId)
  }
  return getTodayBrief()
}
