import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTenantScope } from '@/lib/data/tenant-scope'

type ReorderItem = { id: string; order_index: number }

export async function POST(req: NextRequest) {
  try {
    const { tenantIds } = await requireTenantScope()
    const body = (await req.json()) as { items: ReorderItem[] }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'items required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify all tasks belong to this user's tenants
    const ids = body.items.map((i) => i.id)
    const { data: tasks } = await supabase
      .from('byred_tasks')
      .select('id')
      .in('id', ids)
      .in('tenant_id', tenantIds)

    const validIds = new Set((tasks ?? []).map((t) => t.id))
    const validItems = body.items.filter((i) => validIds.has(i.id))

    // Batch update via individual upserts (Supabase doesn't support batch update with different values)
    const updates = await Promise.all(
      validItems.map((item) =>
        supabase
          .from('byred_tasks')
          .update({ order_index: item.order_index, updated_at: new Date().toISOString() })
          .eq('id', item.id)
      )
    )

    const errors = updates.filter((r) => r.error).map((r) => r.error!.message)
    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0] }, { status: 500 })
    }

    return NextResponse.json({ updated: validItems.length })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
