import { notFound } from 'next/navigation'
import { requireTenantScope } from '@/lib/data/tenant-scope'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type Ctx = { params: Promise<{ id: string }> }

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  done: 'Done',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  blocked: 'Blocked',
}

const STATUS_COLOR: Record<string, string> = {
  not_started: '#71717A',
  in_progress: '#38BDF8',
  done: '#22C55E',
  overdue: '#D7261E',
  blocked: '#F59E0B',
  cancelled: '#52525B',
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#D7261E',
  high: '#F59E0B',
  medium: '#38BDF8',
  low: '#71717A',
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatMinutes(min: number | null) {
  if (!min) return '—'
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#3F3F46', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: '#D4D4D8' }}>
        {value ?? '—'}
      </span>
    </div>
  )
}

export default async function OsTaskDetailPage({ params }: Ctx) {
  const { id } = await params
  const { tenantIds } = await requireTenantScope()

  const supabase = await createClient()
  const { data: task } = await supabase
    .from('byred_tasks')
    .select('*')
    .eq('id', id)
    .in('tenant_id', tenantIds)
    .is('archived_at', null)
    .maybeSingle()

  if (!task) notFound()

  const statusColor = STATUS_COLOR[task.status ?? ''] ?? '#71717A'
  const priorityColor = PRIORITY_COLOR[task.priority ?? ''] ?? '#71717A'

  return (
    <div style={{ padding: '28px 28px 64px', maxWidth: 800 }}>
      {/* Back nav */}
      <Link
        href="/os/tasks"
        style={{
          fontSize: 11,
          color: '#52525B',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          marginBottom: 20,
        }}
      >
        ← Tasks
      </Link>

      {/* Title row */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FAFAFA', letterSpacing: '-0.4px', flex: 1 }}>
            {task.title}
          </h1>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 4,
              background: `${statusColor}18`,
              color: statusColor,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {STATUS_LABEL[task.status ?? ''] ?? task.status}
          </span>
        </div>
        {task.description && (
          <p style={{ fontSize: 13, color: '#71717A', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {task.description}
          </p>
        )}
      </div>

      {/* Meta grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 20,
          background: '#18181B',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 8,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <Field
          label="Priority"
          value={
            task.priority ? (
              <span style={{ color: priorityColor, fontWeight: 600, textTransform: 'capitalize' }}>
                {task.priority}
              </span>
            ) : null
          }
        />
        <Field label="Due date" value={formatDate(task.due_date)} />
        <Field label="Est. time" value={formatMinutes(task.estimated_minutes)} />
        <Field label="Revenue score" value={task.revenue_impact_score?.toString() ?? '—'} />
        <Field label="Urgency score" value={task.urgency_score?.toString() ?? '—'} />
        <Field label="AI mode" value={task.ai_mode ?? '—'} />
      </div>

      {/* Flags */}
      {(task.blocker_flag || task.is_low_hanging_fruit || task.is_ready_for_ai || task.needs_decision) && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 20,
          }}
        >
          {task.blocker_flag && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#D7261E', background: 'rgba(215,38,30,0.12)', padding: '3px 10px', borderRadius: 4 }}>
              BLOCKER
            </span>
          )}
          {task.is_low_hanging_fruit && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,0.12)', padding: '3px 10px', borderRadius: 4 }}>
              LOW HANGING FRUIT
            </span>
          )}
          {task.is_ready_for_ai && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#38BDF8', background: 'rgba(56,189,248,0.12)', padding: '3px 10px', borderRadius: 4 }}>
              AI READY
            </span>
          )}
          {task.needs_decision && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.12)', padding: '3px 10px', borderRadius: 4 }}>
              NEEDS DECISION
            </span>
          )}
        </div>
      )}

      {/* Definition of done / acceptance criteria */}
      {task.definition_of_done && (
        <div
          style={{
            background: '#18181B',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8,
            padding: 20,
            marginBottom: 12,
          }}
        >
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#3F3F46', textTransform: 'uppercase', marginBottom: 8 }}>
            Definition of Done
          </p>
          <p style={{ fontSize: 13, color: '#D4D4D8', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {task.definition_of_done}
          </p>
        </div>
      )}

      {task.acceptance_criteria && (
        <div
          style={{
            background: '#18181B',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 8,
            padding: 20,
            marginBottom: 12,
          }}
        >
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: '#3F3F46', textTransform: 'uppercase', marginBottom: 8 }}>
            Acceptance Criteria
          </p>
          <p style={{ fontSize: 13, color: '#D4D4D8', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {task.acceptance_criteria}
          </p>
        </div>
      )}

      {/* Timestamps */}
      <div
        style={{
          display: 'flex',
          gap: 24,
          marginTop: 24,
          paddingTop: 16,
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <span style={{ fontSize: 10, color: '#3F3F46' }}>
          Created {formatDate(task.created_at)}
        </span>
        {task.updated_at && (
          <span style={{ fontSize: 10, color: '#3F3F46' }}>
            Updated {formatDate(task.updated_at)}
          </span>
        )}
      </div>
    </div>
  )
}
