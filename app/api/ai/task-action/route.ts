import { groq } from "@ai-sdk/groq"
import { streamText } from "ai"
import { NextResponse } from "next/server"
import { z } from "zod"
import { assertTenantApiAccess } from "@/lib/actions/tenant-guard"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 60

const bodySchema = z.object({
  taskId: z.string().uuid(),
  tenantId: z.string().uuid(),
  action: z.enum(["assist", "draft", "execute"]),
  userDisplayName: z.string().max(200).optional(),
})

type AiModeDb = "HUMAN_ONLY" | "AI_ASSIST" | "AI_DRAFT" | "AI_EXECUTE" | null

function actionAllowedForMode(
  action: "assist" | "draft" | "execute",
  mode: AiModeDb
): boolean {
  if (mode === "HUMAN_ONLY" || mode == null) return false
  if (action === "assist") {
    return mode === "AI_ASSIST" || mode === "AI_DRAFT" || mode === "AI_EXECUTE"
  }
  if (action === "draft") {
    return mode === "AI_DRAFT" || mode === "AI_EXECUTE"
  }
  return mode === "AI_EXECUTE"
}

function buildSystemPrompt(action: "assist" | "draft" | "execute"): string {
  const base =
    "You are an execution-focused assistant for By Red OS, a multi-tenant operations product. " +
    "Be concise, practical, and use Markdown (headings, numbered lists, bold for emphasis). " +
    "Do not invent integrations, credentials, or external URLs not implied by the task."

  if (action === "assist") {
    return (
      base +
      " For this request: propose exactly three numbered next actions, then short sections **Risk** and **Next action** (one concrete step)."
    )
  }
  if (action === "draft") {
    return (
      base +
      " For this request: draft ready-to-send content (e.g. email or Slack). Use **Subject:** and **Body** when appropriate."
    )
  }
  return (
    base +
    " For this request: produce a numbered runbook of steps to complete the task as if executing without further confirmation. " +
    "Each step must be verifiable; end with **Verification** (how to confirm success). " +
    "This is a plan only — do not claim external systems were changed."
  )
}

function buildUserPrompt(input: {
  action: "assist" | "draft" | "execute"
  task: {
    title: string
    description: string | null
    status: string | null
    priority: string | null
    due_date: string | null
    ai_mode: AiModeDb
    revenue_impact_score: number | null
    urgency_score: number | null
    blocker_flag: boolean | null
    blocker_reason: string | null
    estimated_minutes: number | null
  }
  userDisplayName?: string
}): string {
  const { task, action, userDisplayName } = input
  const lines = [
    `Task title: ${task.title}`,
    `Description: ${task.description?.trim() || "(none)"}`,
    `Status: ${task.status ?? "unknown"}`,
    `Priority: ${task.priority ?? "unknown"}`,
    `Due date: ${task.due_date ?? "none"}`,
    `AI mode: ${task.ai_mode ?? "unknown"}`,
    `Revenue impact (1–10): ${task.revenue_impact_score ?? "n/a"}`,
    `Urgency (1–10): ${task.urgency_score ?? "n/a"}`,
    `Estimated minutes: ${task.estimated_minutes ?? "n/a"}`,
    `Blocker: ${task.blocker_flag ? "yes" : "no"}`,
    task.blocker_reason
      ? `Blocker reason: ${task.blocker_reason}`
      : undefined,
    userDisplayName ? `User name (for signatures): ${userDisplayName}` : undefined,
    "",
    action === "assist"
      ? "Suggest three concrete next actions for this task."
      : action === "draft"
        ? "Draft message content that moves this task forward."
        : "Produce an execution runbook for this task.",
  ].filter(Boolean)

  return lines.join("\n")
}

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not configured." },
      { status: 503 }
    )
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { taskId, tenantId, action, userDisplayName } = parsed.data

  const guard = await assertTenantApiAccess(tenantId)
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status })
  }

  const supabase = await createClient()
  const { data: row, error: taskError } = await supabase
    .from("byred_tasks")
    .select(
      "title, description, status, priority, due_date, ai_mode, revenue_impact_score, urgency_score, blocker_flag, blocker_reason, estimated_minutes"
    )
    .eq("id", taskId)
    .eq("tenant_id", tenantId)
    .maybeSingle()

  if (taskError || !row) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 })
  }

  const task = row as {
    title: string
    description: string | null
    status: string | null
    priority: string | null
    due_date: string | null
    ai_mode: AiModeDb
    revenue_impact_score: number | null
    urgency_score: number | null
    blocker_flag: boolean | null
    blocker_reason: string | null
    estimated_minutes: number | null
  }

  if (!actionAllowedForMode(action, task.ai_mode)) {
    return NextResponse.json(
      { error: "This action is not allowed for the task's AI mode." },
      { status: 403 }
    )
  }

  const system = buildSystemPrompt(action)
  const prompt = buildUserPrompt({
    action,
    task,
    userDisplayName: userDisplayName?.trim() || undefined,
  })

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system,
    prompt,
    temperature: action === "draft" ? 0.7 : 0.4,
  })

  return result.toTextStreamResponse({
    headers: {
      "X-Task-Action": action,
    },
  })
}
