import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTenantScope } from '@/lib/data/tenant-scope'

export async function GET(_req: NextRequest) {
  try {
    const { tenantIds } = await requireTenantScope()
    if (tenantIds.length === 0) return NextResponse.json({ members: [] })

    const supabase = await createClient()

    const [usersRes, taskCountsRes] = await Promise.all([
      supabase
        .from('byred_users')
        .select('id,name,email,role,avatar_url,monday_user_id')
        .eq('active', true),
      supabase
        .from('byred_tasks')
        .select('owner_user_id')
        .in('tenant_id', tenantIds)
        .neq('status', 'done')
        .neq('status', 'cancelled')
        .is('archived_at', null),
    ])

    const users = usersRes.data ?? []
    const taskRows = taskCountsRes.data ?? []

    const countMap: Record<string, number> = {}
    for (const t of taskRows) {
      if (t.owner_user_id) {
        countMap[t.owner_user_id] = (countMap[t.owner_user_id] ?? 0) + 1
      }
    }

    const members = users.map((u) => ({
      ...u,
      task_count: countMap[u.id] ?? 0,
    }))

    return NextResponse.json({ members })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
