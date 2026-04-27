import "server-only"

import { groq } from "@ai-sdk/groq"
import { generateText, Output } from "ai"
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

type GenerationOk = {
  ok: true
  date: string
  candidates: number
  leadsDue: number
  top3Count: number
}

type GenerationErr = { ok: false; error: string }

type GenerationResult = GenerationOk | GenerationErr

const aiBriefSchema = z.object({
  headline: z.string().min(1).max(400),
  warnings: z.array(z.string().min(1).max(280)).max(12),
  next_action: z.string().min(1).max(900),
  verification_notes: z.array(z.string().min(1).max(280)).max(8),
  priority_task_indices: z.array(z.number().int().min(0)).max(3),
})

const MAX_CANDIDATES = 24
const GROQ_MODEL = "llama-3.3-70b-versatile"
const GROQ_MAX_ATTEMPTS = 3

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
    "Use only the listed task and lead data. Do not invent external updates, completed actions, contacts, prices, or systems.",
    "Warnings should be short operational alerts (max ~12).",
    "Headline: one punchy line for the morning. Next_action: single concrete next step.",
    "verification_notes must state what source data was used and what was missing.",
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

function pacificOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    timeZoneName: "shortOffset",
  }).formatToParts(date)
  const value = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT"
  const match = value.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/)
  if (!match) return 0
  const sign = match[1] === "-" ? -1 : 1
  const hours = Number(match[2] ?? "0")
  const minutes = Number(match[3] ?? "0")
  return sign * (hours * 60 + minutes)
}

function pacificDayUtcBounds(date: string): { start: string; end: string } {
  const [year, month, day] = date.split("-").map(Number)
  const startGuess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  const endGuess = new Date(Date.UTC(year, month - 1, day, 23, 59, 59))
  const startOffset = pacificOffsetMinutes(startGuess)
  const endOffset = pacificOffsetMinutes(endGuess)
  return {
    start: new Date(startGuess.getTime() - startOffset * 60_000).toISOString(),
    end: new Date(endGuess.getTime() - endOffset * 60_000).toISOString(),
  }
}

function buildFallbackSummary(input: {
  today: string
  candidates: TaskRow[]
  leadsDue: LeadRow[]
}): DailyBriefSummary {
  const top3 = indicesToTop3([0, 1, 2], input.candidates)
  const warnings: string[] = []

  const blocked = input.candidates.filter(
    (task) => task.blocker_flag || task.status === "blocked"
  )
  const overdue = input.candidates.filter(
    (task) => task.status === "overdue" || (task.due_date && task.due_date < input.today)
  )

  if (blocked.length > 0) warnings.push(`${blocked.length} blocked task(s) need clearance.`)
  if (overdue.length > 0) warnings.push(`${overdue.length} overdue task(s) are still open.`)
  if (input.leadsDue.length > 0) warnings.push(`${input.leadsDue.length} lead follow-up(s) are due.`)

  return {
    headline:
      top3.length > 0
        ? "Start with the highest-impact open work."
        : "No urgent task candidates found for today.",
    top_3: top3,
    warnings,
    next_action:
      top3[0]?.title ??
      (input.leadsDue[0]
        ? `Follow up with ${input.leadsDue[0].name}.`
        : "Review the task board and confirm no work is missing."),
    verification_notes: [
      `VERIFIED: Used ${input.candidates.length} task candidate(s) and ${input.leadsDue.length} due lead follow-up(s).`,
      "INFERRED: Priority order is based on revenue impact, urgency, due dates, and blocker status.",
    ],
  }
}

async function persistSummary(
  admin: ReturnType<typeof createAdminClient>,
  today: string,
  summary: DailyBriefSummary
): Promise<{ error: string | null }> {
  const payload = summary as unknown as Json

  const { data: existing, error: selErr } = await admin
    .from("byred_daily_briefs")
    .select("id")
    .eq("date", today)
    .is("user_id", null)
    .maybeSingle()

  if (selErr) return { error: `read: ${selErr.message}` }

  if (existing?.id) {
    const { error: upErr } = await admin
      .from("byred_daily_briefs")
      .update({ summary: payload })
      .eq("id", existing.id)
    return { error: upErr ? `update: ${upErr.message}` : null }
  }

  const { error: insErr } = await admin
    .from("byred_daily_briefs")
    .insert({ date: today, user_id: null, summary: payload })
  return { error: insErr ? `insert: ${insErr.message}` : null }
}

async function generateWithRetry(prompt: string): Promise<
  z.infer<typeof aiBriefSchema>
> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= GROQ_MAX_ATTEMPTS; attempt++) {
    try {
      const { output } = await generateText({
        model: groq(GROQ_MODEL),
        output: Output.object({ schema: aiBriefSchema }),
        temperature: 0.35,
        system:
          "You produce strict structured output for By Red OS operations software. " +
          "Focus on revenue, deadlines, blockers, and follow-ups. No preamble.",
        prompt,
      })
      return output
    } catch (e) {
      lastErr = e
      if (attempt < GROQ_MAX_ATTEMPTS) {
        const backoff = 250 * 2 ** (attempt - 1)
        await new Promise((r) => setTimeout(r, backoff))
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Groq generation failed.")
}

export async function runGlobalDailyBriefGeneration(
  opts: { requestId?: string } = {}
): Promise<GenerationResult> {
  const requestId = opts.requestId ?? "local"

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
  const followUpBounds = pacificDayUtcBounds(today)

  const { data: taskRows, error: taskErr } = await admin
    .from("byred_tasks")
    .select(
      "id, title, tenant_id, due_date, priority, status, blocker_flag, revenue_impact_score, urgency_score"
    )
    .not("status", "in", "(done,cancelled)")
    .or(
      `blocker_flag.eq.true,status.eq.blocked,status.eq.overdue,due_date.lte.${today}`
    )
    .order("revenue_impact_score", { ascending: false, nullsFirst: false })
    .order("urgency_score", { ascending: false, nullsFirst: false })
    .limit(200)

  if (taskErr) {
    return { ok: false, error: `tasks query: ${taskErr.message}` }
  }

  const candidates = ((taskRows ?? []) as TaskRow[])
    .sort(sortCandidates)
    .slice(0, MAX_CANDIDATES)

  const { data: leadRows, error: leadErr } = await admin
    .from("byred_leads")
    .select("id, name, tenant_id, stage, next_follow_up_at, revenue_potential")
    .not("stage", "in", "(WON,LOST)")
    .not("next_follow_up_at", "is", null)
    .gte("next_follow_up_at", followUpBounds.start)
    .lte("next_follow_up_at", followUpBounds.end)
    .limit(50)

  if (leadErr) {
    return { ok: false, error: `leads query: ${leadErr.message}` }
  }

  const leads = (leadRows ?? []) as LeadRow[]

  console.info(
    JSON.stringify({
      event: "daily_brief.inputs",
      request_id: requestId,
      date: today,
      candidates: candidates.length,
      leads_due: leads.length,
    })
  )

  if (candidates.length === 0 && leads.length === 0) {
    const summary = buildFallbackSummary({ today, candidates, leadsDue: leads })
    const persisted = await persistSummary(admin, today, summary)
    if (persisted.error) return { ok: false, error: persisted.error }
    return {
      ok: true,
      date: today,
      candidates: 0,
      leadsDue: 0,
      top3Count: 0,
    }
  }

  if (!process.env.GROQ_API_KEY?.trim()) {
    return { ok: false, error: "GROQ_API_KEY is not configured." }
  }

  let aiObject: z.infer<typeof aiBriefSchema>
  try {
    aiObject = await generateWithRetry(
      buildPrompt({ today, candidates, leadsDue: leads })
    )
  } catch (e) {
    return {
      ok: false,
      error: `groq: ${e instanceof Error ? e.message : "generation failed"}`,
    }
  }

  const summary: DailyBriefSummary = {
    headline: aiObject.headline.trim(),
    warnings: aiObject.warnings.map((w) => w.trim()).filter(Boolean),
    next_action: aiObject.next_action.trim(),
    top_3: indicesToTop3(aiObject.priority_task_indices, candidates),
    verification_notes: aiObject.verification_notes
      .map((note) => note.trim())
      .filter(Boolean),
  }

  const persisted = await persistSummary(admin, today, summary)
  if (persisted.error) return { ok: false, error: persisted.error }

  return {
    ok: true,
    date: today,
    candidates: candidates.length,
    leadsDue: leads.length,
    top3Count: summary.top_3.length,
  }
}
