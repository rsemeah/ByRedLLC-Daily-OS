// app/api/os/lantern-ai/route.ts
import { NextRequest } from 'next/server'
import { streamText, convertToModelMessages } from 'ai'
import type { UIMessage } from 'ai'
import { groq } from '@ai-sdk/groq'
import { requireTenantScope } from '@/lib/data/tenant-scope'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `You are LanternAI, the operations intelligence for By Red LLC. You have context \
about the business's projects, tasks, and team. Provide concise, actionable insights. \
Answer questions about task priorities, blockers, project health, and operational strategy. \
Keep replies under 200 words unless detail is explicitly requested.`

const MAX_MESSAGES = 20

export async function POST(req: NextRequest) {
  try {
    const { tenantIds } = await requireTenantScope()
    // ai v6: DefaultChatTransport sends { messages: UIMessage[] }
    const body = (await req.json()) as { messages: UIMessage[] }

    if (!body.messages?.length) {
      return new Response(JSON.stringify({ error: 'messages required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const uiMessages = body.messages.slice(-MAX_MESSAGES)

    // Fetch lightweight operational context
    const supabase = await createClient()
    const [{ count: openCount }, { data: blocked }] = await Promise.all([
      supabase
        .from('byred_tasks')
        .select('*', { count: 'exact', head: true })
        .in('tenant_id', tenantIds)
        .neq('status', 'done')
        .neq('status', 'cancelled'),
      supabase
        .from('byred_tasks')
        .select('title, status, priority')
        .in('tenant_id', tenantIds)
        .eq('status', 'blocked')
        .limit(5),
    ])

    const contextBlock = [
      `Open tasks: ${openCount ?? 0}`,
      blocked?.length
        ? `Blocked: ${blocked.map((t) => `"${t.title}" (${t.priority})`).join(', ')}`
        : 'No blocked tasks',
    ].join('\n')

    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: `${SYSTEM_PROMPT}\n\nCurrent operational snapshot:\n${contextBlock}`,
      messages: await convertToModelMessages(uiMessages),
      maxOutputTokens: 600,
    })

    return result.toUIMessageStreamResponse()
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    console.error('[lantern-ai]', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
