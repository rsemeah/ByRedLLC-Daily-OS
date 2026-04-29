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

    if (scopedIds.length === 0) return NextResponse.json({ triggers: [] })

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('os_triggers')
      .select('*')
      .in('tenant_id', scopedIds)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ triggers: data ?? [] })
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
      watch_entity: string
      watch_condition: Record<string, unknown>
      alert_user_ids?: string[]
      alert_channels?: string[]
      is_active?: boolean
    }

    if (!tenantIds.includes(body.tenant_id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('os_triggers')
      .insert({
        tenant_id: body.tenant_id,
        name: body.name,
        watch_entity: body.watch_entity,
        watch_condition: body.watch_condition as unknown as Json,
        alert_user_ids: body.alert_user_ids ?? [],
        alert_channels: body.alert_channels ?? [],
        is_active: body.is_active ?? true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ trigger: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
