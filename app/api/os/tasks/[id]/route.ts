import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTenantScope } from '@/lib/data/tenant-scope'
import type { Database } from '@/types/database'

type ByredTasksUpdate = Database['public']['Tables']['byred_tasks']['Update']

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const { tenantIds } = await requireTenantScope()
    const body = (await req.json()) as Record<string, unknown>

    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('byred_tasks')
      .select('id')
      .eq('id', id)
      .in('tenant_id', tenantIds)
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const allowed = [
      'title', 'description', 'status', 'priority', 'due_date', 'order_index',
      'owner_user_id', 'project_id', 'board_id', 'phase_id',
      'blocker_flag', 'blocker_reason',
      'is_low_hanging_fruit', 'is_ready_for_ai', 'is_ready_for_human',
      'needs_decision', 'waiting_on_external',
      'definition_of_done', 'acceptance_criteria', 'completed_at',
    ]
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (key in body) patch[key] = body[key]
    }

    const { data, error } = await supabase
      .from('byred_tasks')
      .update(patch as ByredTasksUpdate)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ task: data })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const { tenantIds } = await requireTenantScope()
    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('byred_tasks')
      .select('id')
      .eq('id', id)
      .in('tenant_id', tenantIds)
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { error } = await supabase
      .from('byred_tasks')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
