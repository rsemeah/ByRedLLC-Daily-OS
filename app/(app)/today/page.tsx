import { format } from "date-fns"
import {
  Flame,
  DollarSign,
  Zap,
  Calendar,
  Brain,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TenantPill } from "@/components/byred/tenant-pill"
import { DueDateCell } from "@/components/byred/due-date-cell"
import { getTasks } from "@/lib/data/tasks"
import { getDailyBriefForSession } from "@/lib/data/daily-briefs"
import Link from "next/link"
import type { Task } from "@/types/db"

const BUCKETS: {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  color: string
  headerColor: string
  filter: (t: Task) => boolean
}[] = [
  {
    key: "critical_now",
    label: "Critical Now",
    icon: Flame,
    color: "border-byred-red/30",
    headerColor: "text-byred-red",
    filter: (t) =>
      t.priority === "critical" &&
      (t.status === "in_progress" || t.status === "overdue"),
  },
  {
    key: "money_moves",
    label: "Money Moves",
    icon: DollarSign,
    color: "border-emerald-500/30",
    headerColor: "text-emerald-400",
    filter: (t) => t.revenue_impact_score >= 7,
  },
  {
    key: "quick_wins",
    label: "Quick Wins",
    icon: Zap,
    color: "border-sky-500/30",
    headerColor: "text-sky-400",
    filter: (t) => t.estimated_minutes <= 30,
  },
  {
    key: "coming_up",
    label: "Coming Up",
    icon: Calendar,
    color: "border-zinc-200",
    headerColor: "text-zinc-500",
    filter: (t) => {
      const today = new Date().toISOString().split("T")[0]
      return !!(t.due_date && t.due_date > today)
    },
  },
  {
    key: "deep_work",
    label: "Deep Work",
    icon: Brain,
    color: "border-amber-500/30",
    headerColor: "text-amber-400",
    filter: (t) => t.estimated_minutes >= 60,
  },
]

function formatMinutes(min: number) {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function TaskCard({ task }: { task: Task }) {
  return (
    <div className="p-3 rounded-md bg-white border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-medium text-zinc-700 leading-snug line-clamp-2">
          {task.title}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <TenantPill tenantId={task.tenant_id} />
          <DueDateCell dueDate={task.due_date} />
          <span className="text-xs text-zinc-400 font-mono">
            {formatMinutes(task.estimated_minutes)}
          </span>
        </div>
        <Button
          asChild
          size="sm"
          className="h-6 px-2 text-[10px] bg-byred-red hover:bg-byred-red-hot text-white shrink-0"
        >
          <Link href={`/tasks/${task.id}`}>Do now</Link>
        </Button>
      </div>
    </div>
  )
}

export default async function TodayPage() {
  const [tasks, brief] = await Promise.all([getTasks(), getDailyBriefForSession()])

  const today = new Date()
  const todayStr = format(today, "EEEE, MMMM d")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-condensed font-bold text-zinc-900 tracking-tight">
          Today{" "}
          <span className="text-zinc-400 font-medium text-2xl">
            · {todayStr}
          </span>
        </h1>
        <p className="text-sm text-zinc-500 mt-1">{brief.summary.headline}</p>
      </div>

      {/* Daily Brief card */}
      <Card className="bg-white border-byred-red/30 shadow-sm">
        <CardHeader className="pb-3">
          <h2 className="text-sm font-condensed font-semibold text-zinc-600 uppercase tracking-wide">
            Brief
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Top 3 */}
          {brief.summary.top_3.length > 0 ? (
            <ol className="space-y-1.5">
              {brief.summary.top_3.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-sm text-zinc-700"
                >
                  <span className="text-byred-red font-condensed font-semibold shrink-0 w-4">
                    {i + 1}.
                  </span>
                  {typeof item === "string" ? item : item.title}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-zinc-400">
              No priority tasks identified yet.
            </p>
          )}

          {/* Warnings */}
          {brief.summary.warnings.length > 0 && (
            <div className="space-y-1.5">
              {brief.summary.warnings.map((w, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50 border border-amber-200"
                >
                  <AlertTriangle
                    className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"
                    strokeWidth={1.75}
                  />
                  <p className="text-xs text-amber-700">{w}</p>
                </div>
              ))}
            </div>
          )}

          {/* Next action */}
          <div className="pt-2 border-t border-zinc-100">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">
              Next Action
            </p>
            <p className="text-sm font-semibold text-zinc-800">
              {brief.summary.next_action}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 5-bucket grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {BUCKETS.map(({ key, label, icon: Icon, color, headerColor, filter }) => {
          const bucketTasks = tasks.filter(filter)
          return (
            <Card
              key={key}
              className={`bg-zinc-50 border ${color} flex flex-col`}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`w-4 h-4 ${headerColor}`}
                      strokeWidth={1.75}
                    />
                    <h3
                      className={`text-xs font-condensed font-semibold uppercase tracking-wide ${headerColor}`}
                    >
                      {label}
                    </h3>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">
                    {bucketTasks.length}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-4 flex-1">
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {bucketTasks.length === 0 ? (
                    <p className="text-xs text-zinc-400 text-center py-8">
                      No {label.toLowerCase()}.
                    </p>
                  ) : (
                    bucketTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
