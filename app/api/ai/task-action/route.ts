import { groq } from "@ai-sdk/groq"
import { streamText } from "ai"
import { NextResponse } from "next/server"
import { z } from "zod"
import { assertTenantApiAccess } from "@/lib/actions/tenant-guard"
import { correlationId, logger } from "@/lib/observability/logger"
import { createClient } from "@/lib/supabase/server"
import {
  CONTRACT_VERSION,
  buildSystemPrompt,
  buildUserPrompt,
  temperatureFor,
  validateTaskForAi,
  type TaskContext,
} from "@/lib/ai/task-action-contract"

export const maxDuration = 60

const bodySchema = z.object({
  taskId: z.string().uuid(),
  tenantId: z.string().uuid(),
  action: z.enum(["assist", "draft", "execute"]),
  userDisplayName: z.string().max(200).optional(),
})

const TASK_FIELDS =
  "title, description, status, priority, due_date, ai_mode, revenue_impact_score, urgency_score, blocker_flag, blocker_reason, estimated_minutes"

export async function POST(req: Request) {
  const requestId = correlationId(req)
  const log = logger.child({
    component: "ai_task_action",
    request_id: requestId,
  })

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
    .select(TASK_FIELDS)
    .eq("id", taskId)
    .eq("tenant_id", tenantId)
    .maybeSingle()

  if (taskError || !row) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 })
  }

  const task = row as TaskContext

  const validation = validateTaskForAi(task, action)
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
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
    temperature: temperatureFor(action),
    onError({ error }) {
      log.error(
        "stream_error",
        { task_id: taskId, tenant_id: tenantId, action },
        error
      )
    },
  })

  return result.toTextStreamResponse({
    headers: {
      "X-Task-Action": action,
      "X-Contract-Version": CONTRACT_VERSION,
    },
  })
}
