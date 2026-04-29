import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTenantScope } from '@/lib/data/tenant-scope'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const { tenantIds } = await requireTenantScope()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('os_task_dependencies')
      .select('id,depends_on_task_id,created_at')
      .eq('task_id', id)
      .in('tenant_id', tenantIds)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ dependencies: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const { tenantIds } = await requireTenantScope()
    const body = (await req.json()) as { depends_on_task_id: string; tenant_id: string }

    if (!tenantIds.includes(body.tenant_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (id === body.depends_on_task_id) {
      return NextResponse.json({ error: 'A task cannot depend on itself' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('os_task_dependencies')
      .insert({
        task_id: id,
        depends_on_task_id: body.depends_on_task_id,
        tenant_id: body.tenant_id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Dependency already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ dependency: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const { tenantIds } = await requireTenantScope()
    const body = (await req.json()) as { depends_on_task_id: string }

    const supabase = await createClient()
    const { error } = await supabase
      .from('os_task_dependencies')
      .delete()
      .eq('task_id', id)
      .eq('depends_on_task_id', body.depends_on_task_id)
      .in('tenant_id', tenantIds)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
