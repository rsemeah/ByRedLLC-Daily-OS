import Link from "next/link"
import {
  ArrowRight,
  Calendar,
  DollarSign,
  Flame,
  Sparkles,
  Target,
  Zap,
} from "lucide-react"
import { MetricCard } from "@/components/byred/metric-card"
import { TaskTable } from "@/components/byred/task-table"
import { getTasks, getTaskStats } from "@/lib/data/tasks"
import type { Task } from "@/types/db"

function sortTasks(tasks: Task[]) {
  const today = new Date().toISOString().split("T")[0]
  return [...tasks].sort((a, b) => {
    const aOverdue = a.due_date && a.due_date <= today ? 1 : 0
    const bOverdue = b.due_date && b.due_date <= today ? 1 : 0
    if (bOverdue !== aOverdue) return bOverdue - aOverdue
    if (b.revenue_impact_score !== a.revenue_impact_score)
      return b.revenue_impact_score - a.revenue_impact_score
    if (b.urgency_score !== a.urgency_score)
      return b.urgency_score - a.urgency_score
    return a.estimated_minutes - b.estimated_minutes
  })
}

function formatDueDate(date: string | null) {
  if (!date) return "No deadline"

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`))
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}m`

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`
}

export default async function CommandCenterPage() {
  const [allTasks, stats] = await Promise.all([getTasks(), getTaskStats()])

  const tasks = sortTasks(allTasks)
  const focusTask = tasks[0]
  const nextTasks = tasks.slice(1, 4)
  const activeTasks = tasks.filter(
    (task) => task.status !== "done" && task.status !== "cancelled"
  )

  return (
    <div className="space-y-6 px-6 py-6">
      <div className="relative overflow-hidden rounded-[28px] border border-zinc-950 bg-zinc-950 text-white shadow-2xl shadow-zinc-950/15">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(208,44,42,0.52),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(255,255,255,0.18),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.10),transparent_46%)]" />
        <div className="absolute right-[-120px] top-[-140px] h-80 w-80 rounded-full border border-white/10 bg-white/5 blur-sm" />
        <div className="absolute bottom-[-90px] left-[45%] h-56 w-56 rounded-full bg-byred-red/30 blur-3xl" />

        <div className="relative grid gap-8 p-6 md:p-8 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-h-[330px] flex-col justify-between gap-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-byred-red-hot" />
                High-definition command layer
              </div>
              <h1 className="mt-7 max-w-4xl font-condensed text-6xl font-bold uppercase leading-[0.86] tracking-tight text-white md:text-8xl">
                Orchestrate the work that moves revenue.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-white/62 md:text-base">
                A sharper front page for ByRed OS: urgent work, money moves,
                quick wins, and the next task in one cinematic cockpit.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  Active load
                </p>
                <p className="mt-3 font-condensed text-4xl font-bold leading-none">
                  {activeTasks.length}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  Critical now
                </p>
                <p className="mt-3 font-condensed text-4xl font-bold leading-none text-byred-red-hot">
                  {stats.criticalNow}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  Money moves
                </p>
                <p className="mt-3 font-condensed text-4xl font-bold leading-none">
                  {stats.moneyMoves}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/12 bg-white/[0.08] p-4 backdrop-blur-xl">
            <div className="rounded-[20px] border border-white/10 bg-zinc-950/70 p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/42">
                    Primary target
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    Highest urgency + revenue weight
                  </p>
                </div>
                <div className="rounded-full bg-byred-red p-2 text-white">
                  <Target className="h-4 w-4" strokeWidth={1.9} />
                </div>
              </div>

              {focusTask ? (
                <Link
                  href={`/tasks/${focusTask.id}`}
                  className="group mt-8 block rounded-2xl border border-white/10 bg-white/[0.06] p-4 transition hover:border-byred-red/70 hover:bg-white/[0.09]"
                >
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-byred-red-hot">
                    Focus next
                    <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                  </div>
                  <h2 className="mt-3 line-clamp-3 text-2xl font-semibold leading-tight text-white">
                    {focusTask.title}
                  </h2>
                  <div className="mt-5 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-xl bg-white/[0.06] p-3">
                      <p className="text-white/35">Due</p>
                      <p className="mt-1 font-medium text-white">
                        {formatDueDate(focusTask.due_date)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/[0.06] p-3">
                      <p className="text-white/35">Impact</p>
                      <p className="mt-1 font-medium text-white">
                        {focusTask.revenue_impact_score}/10
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/[0.06] p-3">
                      <p className="text-white/35">Time</p>
                      <p className="mt-1 font-medium text-white">
                        {formatMinutes(focusTask.estimated_minutes)}
                      </p>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="mt-8 rounded-2xl border border-dashed border-white/15 bg-white/[0.04] p-8 text-center">
                  <p className="font-condensed text-3xl font-bold text-white">
                    Clear board.
                  </p>
                  <p className="mt-2 text-sm text-white/50">
                    Add tasks to light up the command layer.
                  </p>
                </div>
              )}

              <div className="mt-5 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                  Next in queue
                </p>
                {nextTasks.length > 0 ? (
                  nextTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-sm text-white/70 transition hover:border-white/15 hover:text-white"
                    >
                      <span className="truncate">{task.title}</span>
                      <span className="shrink-0 text-[11px] text-white/35">
                        {formatDueDate(task.due_date)}
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-3 text-sm text-white/40">
                    No queued tasks yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Critical Now"
          count={stats.criticalNow}
          icon={Flame}
          iconColor="text-byred-red"
          href="/tasks?filter=critical_now"
        />
        <MetricCard
          label="Money Moves"
          count={stats.moneyMoves}
          icon={DollarSign}
          iconColor="text-emerald-400"
          href="/tasks?filter=money_moves"
        />
        <MetricCard
          label="Quick Wins"
          count={stats.quickWins}
          icon={Zap}
          iconColor="text-sky-400"
          href="/tasks?filter=quick_wins"
        />
        <MetricCard
          label="Coming Up"
          count={stats.comingUp}
          icon={Calendar}
          iconColor="text-zinc-400"
          href="/tasks?filter=coming_up"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Full command stack
            </p>
            <h2 className="mt-1 text-sm font-medium text-zinc-700">
              All tasks
              <span className="ml-2 font-mono text-xs text-zinc-400">
                ({tasks.length})
              </span>
            </h2>
          </div>
          <Link
            href="/tasks/new"
            className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-4 py-2 text-xs font-medium text-white transition hover:bg-byred-red"
          >
            New task
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <TaskTable tasks={tasks} />
      </div>
    </div>
  )
}
