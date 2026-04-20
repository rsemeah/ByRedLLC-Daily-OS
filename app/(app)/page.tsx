import { Flame, DollarSign, Zap, Calendar } from 'lucide-react'
import { MetricCard } from '@/components/byred/metric-card'
import { TaskTable } from '@/components/byred/task-table'
import { SEED_TASKS } from '@/lib/seed'

function sortTasks(tasks: typeof SEED_TASKS) {
  const today = new Date().toISOString().split('T')[0]
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

export default function CommandCenterPage() {
  const tasks = sortTasks(SEED_TASKS)
  const today = new Date().toISOString().split('T')[0]

  const criticalNow = tasks.filter(
    (t) => t.priority === 'Critical' && t.due_date && t.due_date <= today
  ).length
  const moneyMoves = tasks.filter((t) => t.revenue_impact_score >= 7).length
  const quickWins = tasks.filter((t) => t.estimated_minutes <= 30).length
  const comingUp = tasks.filter(
    (t) => t.due_date && t.due_date > today
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
      <h1 className="text-3xl font-condensed font-bold text-zinc-900 tracking-tight">
        Command Center
      </h1>
      <p className="text-sm text-zinc-500 mt-1">
        All tasks across all tenants. Do what&apos;s urgent + highest revenue first.
      </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Critical Now"
          count={criticalNow}
          icon={Flame}
          iconColor="text-byred-red"
          href="/tasks?filter=critical_now"
        />
        <MetricCard
          label="Money Moves"
          count={moneyMoves}
          icon={DollarSign}
          iconColor="text-emerald-400"
          href="/tasks?filter=money_moves"
        />
        <MetricCard
          label="Quick Wins"
          count={quickWins}
          icon={Zap}
          iconColor="text-sky-400"
          href="/tasks?filter=quick_wins"
        />
        <MetricCard
          label="Coming Up"
          count={comingUp}
          icon={Calendar}
          iconColor="text-zinc-400"
          href="/tasks?filter=coming_up"
        />
      </div>

      {/* Task table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-zinc-500">
            All tasks
            <span className="ml-2 text-zinc-400 font-mono text-xs">({tasks.length})</span>
          </h2>
        </div>
        <TaskTable tasks={tasks} />
      </div>
    </div>
  )
}
