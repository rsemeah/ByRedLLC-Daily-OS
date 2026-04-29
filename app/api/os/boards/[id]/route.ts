import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTenantScope } from '@/lib/data/tenant-scope'
import type { Database } from '@/types/database'

type OsBoardsUpdate = Database['public']['Tables']['os_boards']['Update']

type Ctx = { params: Promise<{ id: string }> }

async function findBoard(id: string, tenantIds: string[]) {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('os_projects')
    .select('id')
    .in('tenant_id', tenantIds)
    .is('archived_at', null)

  const projectIds = (projects ?? []).map((p) => p.id)
  if (projectIds.length === 0) return null

  const { data } = await supabase
    .from('os_boards')
    .select('*')
    .eq('id', id)
    .in('project_id', projectIds)
    .maybeSingle()

  return data ?? null
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const { tenantIds } = await requireTenantScope()
    const body = (await req.json()) as Record<string, unknown>

    const existing = await findBoard(id, tenantIds)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const supabase = await createClient()
    const allowed = ['name', 'description', 'status', 'board_type', 'kpi_config']
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (key in body) patch[key] = body[key]
    }

    const { data, error } = await supabase
      .from('os_boards')
      .update(patch as OsBoardsUpdate)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ board: data })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const { tenantIds } = await requireTenantScope()

    const existing = await findBoard(id, tenantIds)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const supabase = await createClient()
    const { error } = await supabase
      .from('os_boards')
      .update({ status: 'archived' })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
