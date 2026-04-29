// STUB: TasksList + BoardTabs are light-themed client components; this page
// uses a minimal dark table until those components gain a dark-mode variant.
import { notFound } from 'next/navigation'
import { getTasks, getTasksByTenant } from '@/lib/data/tasks'
import { requireTenantScope } from '@/lib/data/tenant-scope'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Task } from '@/types/db'

type SearchParams = Promise<{ tenant_id?: string; filter?: string }>

type TenantRow = { id: string; name: string; color: string | null }

async function loadTenantTabs(): Promise<TenantRow[]> {
  const { tenantIds } = await requireTenantScope()
  if (tenantIds.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('byred_tenants')
    .select('id,name,color')
    .in('id', tenantIds)
    .eq('active', true)
    .order('name', { ascending: true })
  return (data ?? []) as TenantRow[]
}

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  done: 'Done',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  blocked: 'Blocked',
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#D7261E',
  high: '#F59E0B',
  medium: '#38BDF8',
  low: '#71717A',
}

function StatusPill({ status }: { status: string }) {
  const isOverdue = status === 'overdue'
  const isBlocked = status === 'blocked'
  const isDone = status === 'done'
  const bg = isOverdue
    ? 'rgba(215,38,30,0.12)'
    : isBlocked
      ? 'rgba(245,158,11,0.12)'
      : isDone
        ? 'rgba(34,197,94,0.12)'
        : 'rgba(255,255,255,0.06)'
  const color = isOverdue
    ? '#D7261E'
    : isBlocked
      ? '#F59E0B'
      : isDone
        ? '#22C55E'
        : '#71717A'
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 7px',
        borderRadius: 3,
        background: bg,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function formatMinutes(min: number) {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default async function OsTasksPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const selectedTenantId = params.tenant_id?.trim() || null
  const filterParam = params.filter?.trim() || null

  const { tenantIds } = await requireTenantScope()
  if (selectedTenantId && !tenantIds.includes(selectedTenantId)) notFound()

  const [tabs, tasks] = await Promise.all([
    loadTenantTabs(),
    selectedTenantId ? getTasksByTenant(selectedTenantId) : getTasks(),
  ])

  const displayTasks: Task[] =
    filterParam === 'blocked' ? tasks.filter((t) => t.status === 'blocked') : tasks

  return (
    <div style={{ padding: '28px 28px 48px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#FAFAFA',
              letterSpacing: '-0.4px',
              marginBottom: 3,
            }}
          >
            Tasks
            {filterParam === 'blocked' && (
              <span
                style={{ marginLeft: 8, fontSize: 14, fontWeight: 500, color: '#D7261E' }}
              >
                · Blockers
              </span>
            )}
          </h1>
          <p style={{ fontSize: 11, color: '#52525B' }}>
            {displayTasks.length} task{displayTasks.length !== 1 ? 's' : ''}
            {selectedTenantId
              ? ` · ${tabs.find((t) => t.id === selectedTenantId)?.name ?? 'Tenant'}`
              : ' · All tenants'}
          </p>
        </div>
        <Link
          href="/os/tasks/new"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: '#FAFAFA',
            background: '#D7261E',
            padding: '0 16px',
            height: 32,
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: 4,
            textDecoration: 'none',
          }}
        >
          + New task
        </Link>
      </div>

      {/* Tenant tabs */}
      {tabs.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: 4,
            marginBottom: 16,
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <Link
            href="/os/tasks"
            style={{
              fontSize: 11,
              fontWeight: !selectedTenantId ? 700 : 400,
              color: !selectedTenantId ? '#FAFAFA' : '#71717A',
              padding: '6px 12px',
              borderBottom: !selectedTenantId
                ? '2px solid #D7261E'
                : '2px solid transparent',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            All
          </Link>
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={`/os/tasks?tenant_id=${t.id}`}
              style={{
                fontSize: 11,
                fontWeight: selectedTenantId === t.id ? 700 : 400,
                color: selectedTenantId === t.id ? '#FAFAFA' : '#71717A',
                padding: '6px 12px',
                borderBottom:
                  selectedTenantId === t.id
                    ? `2px solid ${t.color ?? '#D7261E'}`
                    : '2px solid transparent',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {t.name}
            </Link>
          ))}
        </div>
      )}

      {/* Task table */}
      {displayTasks.length === 0 ? (
        <div
          style={{
            padding: '60px 0',
            textAlign: 'center',
            color: '#3F3F46',
            fontSize: 13,
          }}
        >
          {filterParam === 'blocked' ? 'No blocked tasks.' : 'No tasks found.'}
        </div>
      ) : (
        <div
          style={{
            background: '#18181B',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px 80px 60px 70px',
              padding: '8px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            {['Task', 'Status', 'Priority', 'Time', ''].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  color: '#3F3F46',
                  textTransform: 'uppercase',
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {displayTasks.map((task) => (
            <div
              key={task.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 100px 80px 60px 70px',
                padding: '10px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                alignItems: 'center',
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  color: '#D4D4D8',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  paddingRight: 12,
                }}
              >
                {task.title}
              </p>
              <StatusPill status={task.status ?? ''} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: PRIORITY_COLOR[task.priority ?? ''] ?? '#71717A',
                  textTransform: 'capitalize',
                }}
              >
                {task.priority ?? '—'}
              </span>
              <span
                style={{ fontSize: 10, color: '#52525B', fontFamily: 'monospace' }}
              >
                {formatMinutes(task.estimated_minutes)}
              </span>
              <Link
                href={`/os/tasks/${task.id}`}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#D7261E',
                  textDecoration: 'none',
                  letterSpacing: 0.3,
                  textTransform: 'uppercase',
                }}
              >
                Open →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
