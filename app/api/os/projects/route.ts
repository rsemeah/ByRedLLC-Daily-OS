import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTenantScope } from '@/lib/data/tenant-scope'

export async function GET(req: NextRequest) {
  try {
    const { tenantIds } = await requireTenantScope()
    const tenantId = req.nextUrl.searchParams.get('tenant_id')

    const scopedIds = tenantId
      ? tenantIds.filter((id) => id === tenantId)
      : tenantIds

    if (scopedIds.length === 0) return NextResponse.json({ projects: [] })

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('os_projects')
      .select('id,tenant_id,name,description,status,priority,due_date,order_index,created_at')
      .in('tenant_id', scopedIds)
      .is('archived_at', null)
      .order('order_index', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ projects: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantIds } = await requireTenantScope()
    const body = (await req.json()) as {
      tenant_id: string
      name: string
      description?: string
      status?: string
      priority?: string
      due_date?: string
    }

    if (!tenantIds.includes(body.tenant_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('os_projects')
      .insert({
        tenant_id: body.tenant_id,
        name: body.name,
        description: body.description ?? null,
        status: body.status ?? 'active',
        priority: body.priority ?? 'medium',
        due_date: body.due_date ?? null,
        order_index: 0,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ project: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
