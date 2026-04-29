import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTenantScope } from '@/lib/data/tenant-scope'

export async function GET(req: NextRequest) {
  try {
    const { tenantIds } = await requireTenantScope()
    const tenantId = req.nextUrl.searchParams.get('tenant_id')
    const projectId = req.nextUrl.searchParams.get('project_id')

    const supabase = await createClient()

    // Get projects scoped to this user to derive board access
    const projectQuery = supabase
      .from('os_projects')
      .select('id')
      .in('tenant_id', tenantId ? [tenantId].filter((id) => tenantIds.includes(id)) : tenantIds)
      .is('archived_at', null)

    const { data: projects } = await projectQuery
    const projectIds = (projects ?? []).map((p) => p.id)
    if (projectIds.length === 0) return NextResponse.json({ boards: [] })

    let boardQuery = supabase
      .from('os_boards')
      .select('id,project_id,name,description,status,board_type,kpi_config,tenant_id')
      .in('project_id', projectIds)
      .is('archived_at', null)

    if (projectId) boardQuery = boardQuery.eq('project_id', projectId)

    const { data, error } = await boardQuery
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ boards: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantIds } = await requireTenantScope()
    const body = (await req.json()) as {
      project_id: string
      name: string
      description?: string
      board_type?: string
      tenant_id: string
    }

    if (!tenantIds.includes(body.tenant_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createClient()

    // Verify project exists and belongs to tenant
    const { data: project } = await supabase
      .from('os_projects')
      .select('id')
      .eq('id', body.project_id)
      .in('tenant_id', tenantIds)
      .maybeSingle()

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const { data, error } = await supabase
      .from('os_boards')
      .insert({
        project_id: body.project_id,
        name: body.name,
        description: body.description ?? null,
        board_type: body.board_type ?? 'kanban',
        status: 'active',
        tenant_id: body.tenant_id,
        kpi_config: [],
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ board: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
