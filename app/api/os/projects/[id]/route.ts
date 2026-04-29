import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTenantScope } from '@/lib/data/tenant-scope'
import type { Database } from '@/types/database'

type OsProjectsUpdate = Database['public']['Tables']['os_projects']['Update']

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const { tenantIds } = await requireTenantScope()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('os_projects')
      .select('*')
      .eq('id', id)
      .in('tenant_id', tenantIds)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ project: data })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const { tenantIds } = await requireTenantScope()
    const body = (await req.json()) as Record<string, unknown>

    const supabase = await createClient()

    // Verify ownership before patch
    const { data: existing } = await supabase
      .from('os_projects')
      .select('id,tenant_id')
      .eq('id', id)
      .in('tenant_id', tenantIds)
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const allowed = ['name', 'description', 'status', 'priority', 'due_date', 'order_index']
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (key in body) patch[key] = body[key]
    }

    const { data, error } = await supabase
      .from('os_projects')
      .update(patch as OsProjectsUpdate)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ project: data })
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
      .from('os_projects')
      .select('id')
      .eq('id', id)
      .in('tenant_id', tenantIds)
      .maybeSingle()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { error } = await supabase
      .from('os_projects')
      .update({ status: 'archived' })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
