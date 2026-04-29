import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTenantScope } from '@/lib/data/tenant-scope'
import type { Database } from '@/types/database'

type OsWorkflowsUpdate = Database['public']['Tables']['os_workflows']['Update']

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const { tenantIds } = await requireTenantScope()
    const body = (await req.json()) as Record<string, unknown>

    const supabase = await createClient()
    const { data: existing } = await supabase
      .from('os_workflows')
      .select('id')
      .eq('id', id)
      .in('tenant_id', tenantIds)
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const allowed = ['name', 'trigger_event', 'condition', 'action', 'is_active']
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (key in body) patch[key] = body[key]
    }

    const { data, error } = await supabase
      .from('os_workflows')
      .update(patch as OsWorkflowsUpdate)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ workflow: data })
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
      .from('os_workflows')
      .select('id')
      .eq('id', id)
      .in('tenant_id', tenantIds)
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { error } = await supabase.from('os_workflows').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
