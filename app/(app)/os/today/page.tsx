import { format } from "date-fns"
import { Flame, DollarSign, Zap, Calendar, Brain, AlertTriangle, ArrowRight } from "lucide-react"
import { getTasks } from "@/lib/data/tasks"
import { getTodayBrief } from "@/lib/data/daily-briefs"
import Link from "next/link"
import type { Task } from "@/types/db"
import { cn } from "@/lib/utils"

const BUCKETS: {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  accent: string
  filter: (t: Task) => boolean
}[] = [
  {
    key: "critical_now",
    label: "Critical Now",
    icon: Flame,
    accent: "text-red-400",
    filter: (t) =>
      t.priority === "critical" &&
      (t.status === "in_progress" || t.status === "overdue"),
  },
  {
    key: "money_moves",
    label: "Money Moves",
    icon: DollarSign,
    accent: "text-emerald-400",
    filter: (t) => (t.revenue_impact_score ?? 0) >= 7,
  },
  {
    key: "quick_wins",
    label: "Quick Wins",
    icon: Zap,
    accent: "text-sky-400",
    filter: (t) => (t.estimated_minutes ?? 0) <= 30 && (t.estimated_minutes ?? 0) > 0,
  },
  {
    key: "coming_up",
    label: "Coming Up",
    icon: Calendar,
    accent: "text-zinc-400",
    filter: (t) => {
      const today = new Date().toISOString().split("T")[0]
      return !!(t.due_date && t.due_date > today)
    },
  },
  {
    key: "deep_work",
    label: "Deep Work",
    icon: Brain,
    accent: "text-amber-400",
    filter: (t) => (t.estimated_minutes ?? 0) >= 60,
  },
]

function fmtMinutes(min: number) {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function TaskCard({ task }: { task: Task }) {
  return (
    <Link
      href={`/os/tasks/${task.id}`}
      className="group flex flex-col gap-2 p-3 rounded-lg bg-zinc-800/60 border border-zinc-700/60 hover:border-zinc-600 hover:bg-zinc-800 transition-colors"
    >
      <p className="text-xs font-medium text-zinc-200 leading-snug line-clamp-2 group-hover:text-white transition-colors">
        {task.title}
      </p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {task.due_date && (
            <span className="text-[10px] text-zinc-600 font-mono">
              {new Date(task.due_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          {(task.estimated_minutes ?? 0) > 0 && (
            <span className="text-[10px] text-zinc-600 font-mono">
              {fmtMinutes(task.estimated_minutes ?? 0)}
            </span>
          )}
        </div>
        <ArrowRight
          className="w-3 h-3 text-zinc-700 group-hover:text-zinc-400 transition-colors"
          strokeWidth={1.75}
        />
      </div>
    </Link>
  )
}

export default async function OSTodayPage() {
  const [tasks, brief] = await Promise.all([getTasks(), getTodayBrief()])
  const todayStr = format(new Date(), "EEEE, MMMM d")

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight font-condensed">
          Today{" "}
          <span className="text-zinc-600 font-normal">· {todayStr}</span>
        </h1>
        <p className="text-xs text-zinc-500 mt-1">{brief.summary.headline}</p>
      </div>

      {/* Daily brief */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800">
          <span className="text-[10px] font-semibold tracking-widest text-zinc-600 uppercase">
            Daily Brief
          </span>
        </div>
        <div className="px-5 py-4 space-y-4">
          {brief.summary.top_3.length > 0 ? (
            <ol className="space-y-2">
              {brief.summary.top_3.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300">
                  <span className="text-[#D7261E] font-bold font-condensed shrink-0 w-4">
                    {i + 1}.
                  </span>
                  {typeof item === "string"
                    ? item
                    : (item as { title: string }).title}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-zinc-600">No priority tasks identified yet.</p>
          )}

          {brief.summary.warnings.length > 0 && (
            <div className="space-y-1.5">
              {brief.summary.warnings.map((w, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-950/40 border border-amber-900/40"
                >
                  <AlertTriangle
                    className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5"
                    strokeWidth={1.75}
                  />
                  <p className="text-xs text-amber-400">{w}</p>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-zinc-800">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">
              Next Action
            </p>
            <p className="text-sm font-semibold text-white">
              {brief.summary.next_action}
            </p>
          </div>
        </div>
      </div>

      {/* 5-bucket grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {BUCKETS.map(({ key, label, icon: Icon, accent, filter }) => {
          const bucketTasks = tasks.filter(filter)
          return (
            <div
              key={key}
              className="rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <div className={cn("flex items-center gap-2", accent)}>
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span className="text-[11px] font-semibold uppercase tracking-wide">
                    {label}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-700">
                  {bucketTasks.length}
                </span>
              </div>
              <div className="p-3 flex-1 space-y-2 max-h-[500px] overflow-y-auto">
                {bucketTasks.length === 0 ? (
                  <p className="text-[11px] text-zinc-700 text-center py-6">
                    None.
                  </p>
                ) : (
                  bucketTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
