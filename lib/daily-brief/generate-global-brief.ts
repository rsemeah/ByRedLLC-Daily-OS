import "server-only"

import { groq } from "@ai-sdk/groq"
import { generateObject } from "ai"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { calendarDatePacific } from "@/lib/time/pacific-date"
import type { DailyBriefSummary, Json } from "@/types/database"

type TaskRow = {
  id: string
  title: string
  tenant_id: string
  due_date: string | null
  priority: string | null
  status: string | null
  blocker_flag: boolean | null
  revenue_impact_score: number | null
  urgency_score: number | null
}

type LeadRow = {
  id: string
  name: string
  tenant_id: string
  stage: string | null
  next_follow_up_at: string | null
  revenue_potential: number | null
}

const aiBriefSchema = z.object({
  headline: z.string().max(400),
  warnings: z.array(z.string()).max(12),
  next_action: z.string().max(900),
  priority_task_indices: z.array(z.number().int().min(0)).max(3),
})

function taskIsBriefRelevant(t: TaskRow, today: string): boolean {
  const status = t.status ?? ""
  if (status === "done" || status === "cancelled") return false
  if (t.blocker_flag || status === "blocked") return true
  if (status === "overdue") return true
  if (!t.due_date) return false
  const d = t.due_date.slice(0, 10)
  return d <= today
}

function leadFollowUpDue(l: LeadRow, today: string): boolean {
  if (!l.next_follow_up_at) return false
  const d = l.next_follow_up_at.slice(0, 10)
  return d <= today
}

function sortCandidates(a: TaskRow, b: TaskRow): number {
  const rr = (b.revenue_impact_score ?? 0) - (a.revenue_impact_score ?? 0)
  if (rr !== 0) return rr
  return (b.urgency_score ?? 0) - (a.urgency_score ?? 0)
}

function buildPrompt(input: {
  today: string
  candidates: TaskRow[]
  leadsDue: LeadRow[]
}): string {
  const taskLines = input.candidates.map(
    (t, i) =>
      `${i}. ${t.title} | id=${t.id} | tenant=${t.tenant_id} | due=${t.due_date ?? "none"} | priority=${t.priority ?? "?"} | status=${t.status ?? "?"} | blocker=${t.blocker_flag ? "yes" : "no"}`
  )
  const leadLines = input.leadsDue.map(
    (l) =>
      `- ${l.name} | tenant=${l.tenant_id} | stage=${l.stage ?? "?"} | follow-up=${l.next_follow_up_at ?? "none"} | rev=${l.revenue_potential ?? "?"}`
  )

  return [
    `Today (Pacific calendar date): ${input.today}`,
    "",
    "Candidate tasks (indices are 0-based positions in THIS list only):",
    taskLines.length ? taskLines.join("\n") : "(none)",
    "",
    "Leads with follow-up due or overdue (context for warnings only):",
    leadLines.length ? leadLines.join("\n") : "(none)",
    "",
    "Return priority_task_indices as up to 3 distinct indices into the candidate task list above.",
    "If there are no candidate tasks, use an empty array for priority_task_indices.",
    "Warnings should be short operational alerts (max ~12).",
    "Headline: one punchy line for the morning. Next_action: single concrete next step.",
  ].join("\n")
}

function indicesToTop3(
  indices: number[],
  candidates: TaskRow[]
): DailyBriefSummary["top_3"] {
  const seen = new Set<number>()
  const out: DailyBriefSummary["top_3"] = []
  for (const raw of indices) {
    const i = Math.floor(raw)
    if (seen.has(i) || i < 0 || i >= candidates.length) continue
    seen.add(i)
    const t = candidates[i]
    out.push({
      id: t.id,
      title: t.title,
      tenant_id: t.tenant_id,
      due_date: t.due_date,
      priority: t.priority ?? "medium",
    })
    if (out.length >= 3) break
  }
  return out
}

export async function runGlobalDailyBriefGeneration(): Promise<
  { ok: true; date: string } | { ok: false; error: string }
> {
  if (!process.env.GROQ_API_KEY?.trim()) {
    return { ok: false, error: "GROQ_API_KEY is not configured." }
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Admin client unavailable.",
    }
  }

  const today = calendarDatePacific()

  const { data: taskRows, error: taskErr } = await admin
    .from("byred_tasks")
    .select(
      "id, title, tenant_id, due_date, priority, status, blocker_flag, revenue_impact_score, urgency_score"
    )

  if (taskErr) {
    return { ok: false, error: taskErr.message }
  }

  const tasks = (taskRows ?? []) as TaskRow[]
  const relevant = tasks
    .filter((t) => taskIsBriefRelevant(t, today))
    .sort(sortCandidates)

  const { data: leadRows, error: leadErr } = await admin
    .from("byred_leads")
    .select("id, name, tenant_id, stage, next_follow_up_at, revenue_potential")

  if (leadErr) {
    return { ok: false, error: leadErr.message }
  }

  const leads = ((leadRows ?? []) as LeadRow[]).filter(
    (l) =>
      l.stage !== "WON" &&
      l.stage !== "LOST" &&
      leadFollowUpDue(l, today)
  )

  const candidates = relevant.slice(0, 24)

  try {
    const { object } = await generateObject({
      model: groq("llama-3.3-70b-versatile"),
      schema: aiBriefSchema,
      temperature: 0.35,
      system:
        "You produce strict structured output for By Red OS operations software. " +
        "Focus on revenue, deadlines, blockers, and follow-ups. No preamble.",
      prompt: buildPrompt({ today, candidates, leadsDue: leads }),
    })

    const summary: DailyBriefSummary = {
      headline: object.headline.trim(),
      warnings: object.warnings.map((w) => w.trim()).filter(Boolean),
      next_action: object.next_action.trim(),
      top_3: indicesToTop3(object.priority_task_indices, candidates),
    }

    const { data: existing } = await admin
      .from("byred_daily_briefs")
      .select("id")
      .eq("date", today)
      .is("user_id", null)
      .maybeSingle()

    const payload = summary as unknown as Json

    if (existing?.id) {
      const { error: upErr } = await admin
        .from("byred_daily_briefs")
        .update({ summary: payload })
        .eq("id", existing.id)

      if (upErr) return { ok: false, error: upErr.message }
    } else {
      const { error: insErr } = await admin.from("byred_daily_briefs").insert({
        date: today,
        user_id: null,
        summary: payload,
      })

      if (insErr) return { ok: false, error: insErr.message }
    }

    return { ok: true, date: today }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Generation failed.",
    }
  }
}
