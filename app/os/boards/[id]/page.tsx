import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireTenantScope } from '@/lib/data/tenant-scope'
import KanbanBoard from '@/components/kanban/KanbanBoard'
import Link from 'next/link'

type Ctx = { params: Promise<{ id: string }> }

export default async function OsBoardDetailPage({ params }: Ctx) {
  const { id } = await params
  const { tenantIds } = await requireTenantScope()

  const supabase = await createClient()

  // Resolve board → project → tenant for scope check
  const { data: board } = await supabase
    .from('os_boards')
    .select('id,name,description,status,board_type,tenant_id,project_id,os_projects(name)')
    .eq('id', id)
    .maybeSingle()

  if (!board || !tenantIds.includes(board.tenant_id ?? '')) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projectName = (board as any).os_projects?.name ?? null

  return (
    <div>
      {/* Board header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '20px 28px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Link
          href="/os/boards"
          style={{ fontSize: 11, color: '#52525B', textDecoration: 'none' }}
        >
          Boards
        </Link>
        <span style={{ color: '#3F3F46', fontSize: 11 }}>/</span>
        {projectName && (
          <>
            <span style={{ fontSize: 11, color: '#52525B' }}>{projectName}</span>
            <span style={{ color: '#3F3F46', fontSize: 11 }}>/</span>
          </>
        )}
        <span style={{ fontSize: 11, color: '#FAFAFA', fontWeight: 600 }}>{board.name}</span>

        <span
          style={{
            marginLeft: 8,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: board.status === 'active' ? '#22C55E' : '#52525B',
            background:
              board.status === 'active' ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.04)',
            padding: '2px 6px',
            borderRadius: 3,
          }}
        >
          {board.status ?? 'active'}
        </span>
      </div>

      {/* Kanban board (client component with DnD + real-time) */}
      <div style={{ paddingTop: 16 }}>
        <KanbanBoard boardId={id} />
      </div>
    </div>
  )
}
