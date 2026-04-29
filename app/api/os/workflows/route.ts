import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTenantScope } from '@/lib/data/tenant-scope'
import type { Json } from '@/types/database'

export async function GET(req: NextRequest) {
  try {
    const { tenantIds } = await requireTenantScope()
    const tenantId = req.nextUrl.searchParams.get('tenant_id')
    const scopedIds = tenantId
      ? tenantIds.filter((id) => id === tenantId)
      : tenantIds

    if (scopedIds.length === 0) return NextResponse.json({ workflows: [] })

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('os_workflows')
      .select('*')
      .in('tenant_id', scopedIds)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ workflows: data ?? [] })
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
      trigger_event: string
      condition?: Record<string, unknown> | null
      action: Record<string, unknown>
      is_active?: boolean
    }

    if (!tenantIds.includes(body.tenant_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('os_workflows')
      .insert({
        tenant_id: body.tenant_id,
        name: body.name,
        trigger_event: body.trigger_event,
        condition: (body.condition ?? null) as unknown as Json,
        action: body.action as unknown as Json,
        is_active: body.is_active ?? true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ workflow: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
