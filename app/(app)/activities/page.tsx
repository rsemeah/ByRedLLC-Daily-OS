import { format, parseISO } from "date-fns"
import { ActivityItem } from "@/components/byred/activity-item"
import { getActivities } from "@/lib/data/activities"
import type { Activity } from "@/types/db"

function groupByDay(activities: Activity[]) {
  const groups: Record<string, Activity[]> = {}
  for (const a of activities) {
    const day = format(parseISO(a.created_at), "yyyy-MM-dd")
    if (!groups[day]) groups[day] = []
    groups[day].push(a)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, items]) => ({ day, items }))
}

export default async function ActivitiesPage() {
  const activities = await getActivities()

  const sorted = [...activities].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const grouped = groupByDay(sorted)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-condensed font-bold text-zinc-900 tracking-tight">
          Activities
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {activities.length} {activities.length === 1 ? "activity" : "activities"}
        </p>
      </div>

      <div className="space-y-6">
        {grouped.map(({ day, items }) => (
          <div key={day}>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">
              {format(parseISO(day), "EEEE, MMMM d")}
            </p>
            <div className="divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-white px-4 shadow-sm">
              {items.map((a) => (
                <ActivityItem key={a.id} activity={a} showObject />
              ))}
            </div>
          </div>
        ))}

        {grouped.length === 0 && (
          <p className="text-sm text-zinc-400">No activity.</p>
        )}
      </div>
    </div>
  )
}
