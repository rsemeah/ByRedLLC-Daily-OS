import { getTasks, getTaskStats } from '@/lib/data/tasks'
import { createClient } from '@/lib/supabase/server'
import { requireTenantScope } from '@/lib/data/tenant-scope'
import Link from 'next/link'
import { format } from 'date-fns'

async function getProjects(tenantIds: string[]) {
  if (tenantIds.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('os_projects')
    .select('id,name,description,status,priority,due_date,order_index')
    .in('tenant_id', tenantIds)
    .is('archived_at', null)
    .order('order_index', { ascending: true })
    .limit(6)
  return data ?? []
}

async function getTaskCounts(tenantIds: string[]) {
  if (tenantIds.length === 0) return { active: 0, inProgress: 0, blocked: 0, critical: 0 }
  const supabase = await createClient()
  const { data } = await supabase
    .from('byred_tasks')
    .select('id,status,priority')
    .in('tenant_id', tenantIds)
    .is('archived_at', null)
    .neq('status', 'done')
    .neq('status', 'cancelled')
  const rows = data ?? []
  return {
    active: rows.length,
    inProgress: rows.filter((r) => r.status === 'in_progress').length,
    blocked: rows.filter((r) => r.status === 'blocked').length,
    critical: rows.filter((r) => r.priority === 'critical').length,
  }
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#D7261E',
  high: '#F59E0B',
  medium: '#38BDF8',
  low: '#71717A',
}

export default async function OsDashboardPage() {
  const { tenantIds } = await requireTenantScope()
  const [projects, counts, tasks] = await Promise.all([
    getProjects(tenantIds),
    getTaskCounts(tenantIds),
    getTasks({ limit: 8 }),
  ])

  const today = format(new Date(), 'EEEE, MMMM d')

  const statCards = [
    { label: 'Active Tasks', value: counts.active, color: '#38BDF8' },
    { label: 'In Progress', value: counts.inProgress, color: '#22C55E' },
    { label: 'Blocked', value: counts.blocked, color: '#F59E0B', href: '/os/tasks?filter=blocked' },
    { label: 'Critical', value: counts.critical, color: '#D7261E', href: '/os/tasks?priority=critical' },
  ]

  return (
    <div style={{ padding: '28px 28px 48px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: '#FAFAFA',
            letterSpacing: '-0.5px',
            lineHeight: 1,
            marginBottom: 4,
          }}
        >
          Good morning{' '}
          <span style={{ fontWeight: 400, color: '#52525B', fontSize: 18 }}>· {today}</span>
        </h1>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {statCards.map(({ label, value, color, href }) => {
          const content = (
            <div
              style={{
                background: '#18181B',
                border: `1px solid ${color}22`,
                borderRadius: 8,
                padding: '16px 20px',
                cursor: href ? 'pointer' : 'default',
              }}
            >
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: '#52525B', textTransform: 'uppercase', marginBottom: 8 }}>
                {label}
              </p>
              <p style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
            </div>
          )
          if (href) {
            return (
              <Link key={label} href={href} style={{ textDecoration: 'none' }}>
                {content}
              </Link>
            )
          }
          return <div key={label}>{content}</div>
        })}
      </div>

      {/* Main grid: projects + recent tasks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Active Projects */}
        <div
          style={{
            background: '#18181B',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 700, color: '#FAFAFA', textTransform: 'uppercase', letterSpacing: 1 }}>
              Active Projects
            </p>
            <Link
              href="/os/projects"
              style={{ fontSize: 10, color: '#D7261E', textDecoration: 'none', fontWeight: 700 }}
            >
              View all →
            </Link>
          </div>
          {projects.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#3F3F46', fontSize: 12 }}>
              No active projects.{' '}
              <Link href="/os/projects" style={{ color: '#D7261E' }}>
                Create one →
              </Link>
            </div>
          ) : (
            projects.map((p) => (
              <Link
                key={p.id}
                href={`/os/projects`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = 'transparent')
                  }
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#FAFAFA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, paddingRight: 8 }}>
                      {p.name}
                    </p>
                    {p.priority && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: PRIORITY_COLOR[p.priority] ?? '#71717A',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}
                      >
                        {p.priority}
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p style={{ fontSize: 11, color: '#52525B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.description}
                    </p>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Recent Tasks */}
        <div
          style={{
            background: '#18181B',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 700, color: '#FAFAFA', textTransform: 'uppercase', letterSpacing: 1 }}>
              Recent Tasks
            </p>
            <Link
              href="/os/tasks"
              style={{ fontSize: 10, color: '#D7261E', textDecoration: 'none', fontWeight: 700 }}
            >
              View all →
            </Link>
          </div>
          {tasks.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#3F3F46', fontSize: 12 }}>
              No tasks.
            </div>
          ) : (
            tasks.map((task) => {
              const statusColor =
                task.status === 'blocked'
                  ? '#D7261E'
                  : task.status === 'in_progress'
                  ? '#22C55E'
                  : task.status === 'done'
                  ? '#52525B'
                  : '#71717A'
              return (
                <Link key={task.id} href="/os/tasks" style={{ textDecoration: 'none', display: 'block' }}>
                  <div
                    style={{
                      padding: '10px 16px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = 'transparent')
                    }
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: statusColor,
                        flexShrink: 0,
                      }}
                    />
                    <p style={{ fontSize: 12, color: '#D4D4D8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title}
                    </p>
                    {task.priority && (
                      <span style={{ fontSize: 10, color: PRIORITY_COLOR[task.priority] ?? '#71717A', textTransform: 'capitalize', flexShrink: 0 }}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
