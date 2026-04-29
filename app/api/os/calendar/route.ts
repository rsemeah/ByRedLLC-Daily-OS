import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isInternalMember } from '@/lib/auth/allowlist'

const COLOR_RED = '#D7261E'
const COLOR_ORANGE = '#ea7400'
const COLOR_BLUE = '#2563eb'

export type CalendarItem = {
  id: string
  title: string
  start_at: string
  end_at: string | null
  all_day: boolean
  color: string
  source: 'event' | 'task'
  priority?: string | null
  status?: string | null
  blocker?: boolean
  tenant_id: string
  owner_user_id?: string | null
}

function taskColor(priority: string | null, blocker: boolean): string {
  if (blocker) return COLOR_RED
  if (priority === 'critical' || priority === 'high') return COLOR_ORANGE
  return COLOR_BLUE
}

function eventColor(eventType: string | null, calendarColor: string | null): string {
  if (calendarColor) return calendarColor
  if (eventType === 'deadline' || eventType === 'renewal') return COLOR_RED
  return COLOR_BLUE
}

type EventRow = {
  id: string
  title: string
  start_at: string
  end_at: string | null
  all_day: boolean | null
  event_type: string | null
  calendar_color: string | null
  owner_user_id: string | null
  tenant_id: string
  status: string | null
}

type TaskRow = {
  id: string
  title: string
  due_date: string | null
  priority: string | null
  status: string | null
  blocker_flag: boolean | null
  owner_user_id: string | null
  tenant_id: string
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isInternalMember(authUser.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const tenantId = searchParams.get('tenant_id')
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  if (!tenantId || !start || !end) {
    return NextResponse.json(
      { error: 'tenant_id, start, and end are required' },
      { status: 400 }
    )
  }

  const startDate = start.split('T')[0]
  const endDate = end.split('T')[0]

  // os_calendar_events is not yet in generated types — use `any` cast (established pattern)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [eventsResult, tasksResult] = await Promise.all([
    db
      .from('os_calendar_events')
      .select('id,title,start_at,end_at,all_day,event_type,calendar_color,owner_user_id,tenant_id,status')
      .eq('tenant_id', tenantId)
      .gte('start_at', start)
      .lte('start_at', end)
      .is('archived_at', null)
      .order('start_at', { ascending: true }) as Promise<{ data: EventRow[] | null; error: unknown }>,
    supabase
      .from('byred_tasks')
      .select('id,title,due_date,priority,status,blocker_flag,owner_user_id,tenant_id')
      .eq('tenant_id', tenantId)
      .gte('due_date', startDate)
      .lte('due_date', endDate)
      .not('status', 'in', '("done","cancelled")')
      .order('due_date', { ascending: true }),
  ])

  const { data: eventsData, error: eventsError } = eventsResult
  if (eventsError) {
    console.error('os_calendar_events fetch error', eventsError)
  }

  if (tasksResult.error) {
    console.error('byred_tasks calendar fetch error', tasksResult.error)
  }

  const events = ((eventsData ?? []) as EventRow[]).map((e): CalendarItem => ({
    id: e.id,
    title: e.title,
    start_at: e.start_at,
    end_at: e.end_at,
    all_day: e.all_day ?? false,
    color: eventColor(e.event_type, e.calendar_color),
    source: 'event',
    status: e.status,
    tenant_id: e.tenant_id,
    owner_user_id: e.owner_user_id,
  }))

  const tasks = ((tasksResult.data ?? []) as TaskRow[])
    .filter((t) => t.due_date !== null)
    .map((t): CalendarItem => ({
      id: t.id,
      title: t.title,
      start_at: `${t.due_date}T00:00:00.000Z`,
      end_at: null,
      all_day: true,
      color: taskColor(t.priority, t.blocker_flag ?? false),
      source: 'task',
      priority: t.priority,
      status: t.status,
      blocker: t.blocker_flag ?? false,
      tenant_id: t.tenant_id,
      owner_user_id: t.owner_user_id,
    }))

  const items: CalendarItem[] = [...events, ...tasks].sort(
    (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
  )

  return NextResponse.json({ items })
}
