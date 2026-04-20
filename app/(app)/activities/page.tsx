import { format, parseISO } from 'date-fns'
import { ActivityItem } from '@/components/byred/activity-item'
import { SEED_ACTIVITIES } from '@/lib/seed'

function groupByDay(activities: typeof SEED_ACTIVITIES) {
  const groups: Record<string, typeof SEED_ACTIVITIES> = {}
  for (const a of activities) {
    const day = format(parseISO(a.created_at), 'yyyy-MM-dd')
    if (!groups[day]) groups[day] = []
    groups[day].push(a)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, items]) => ({ day, items }))
}

export default function ActivitiesPage() {
  const sorted = [...SEED_ACTIVITIES].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const grouped = groupByDay(sorted)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-condensed font-bold text-zinc-100 tracking-tight">Activities</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {SEED_ACTIVITIES.length} {SEED_ACTIVITIES.length === 1 ? 'activity' : 'activities'}
        </p>
      </div>

      <div className="space-y-6">
        {grouped.map(({ day, items }) => (
          <div key={day}>
            <p className="text-xs font-medium text-zinc-600 uppercase tracking-widest mb-3">
              {format(parseISO(day), 'EEEE, MMMM d')}
            </p>
            <div className="divide-y divide-zinc-800/50 rounded-md border border-zinc-800 bg-zinc-900 px-4">
              {items.map((a) => (
                <ActivityItem key={a.id} activity={a} showObject />
              ))}
            </div>
          </div>
        ))}

        {grouped.length === 0 && (
          <p className="text-sm text-zinc-600">No activity.</p>
        )}
      </div>
    </div>
  )
}
