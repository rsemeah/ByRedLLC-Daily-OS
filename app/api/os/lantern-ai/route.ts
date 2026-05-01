import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { groq } from '@ai-sdk/groq'
import { requireTenantScope } from '@/lib/data/tenant-scope'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `You are LanternAI, the operations intelligence for By Red LLC. You have context
about the business's projects, tasks, and team. Provide concise, actionable insights.
Answer questions about task priorities, blockers, project health, and operational strategy.
Keep replies under 200 words unless detail is explicitly requested.`

type Message = { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  try {
    const { tenantIds } = await requireTenantScope()
    const body = (await req.json()) as { messages: Message[] }

    if (!body.messages?.length) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    // Fetch lightweight context: open task counts + blocked tasks
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
        ? `Blocked tasks: ${blocked.map((t) => `"${t.title}" (${t.priority})`).join(', ')}`
        : 'No blocked tasks',
    ].join('\n')

    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: `${SYSTEM_PROMPT}\n\nCurrent operational snapshot:\n${contextBlock}`,
      messages: body.messages,
    })

    return NextResponse.json({ reply: text })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[lantern-ai]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
