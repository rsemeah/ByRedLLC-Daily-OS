"use client"

import Link from "next/link"
import {
  FolderKanban,
  CheckSquare,
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowRight,
  Calendar,
  Users,
} from "lucide-react"
import { MOCK_PROJECTS, MOCK_TASKS, MOCK_TEAM, MOCK_CALENDAR_EVENTS } from "@/components/byred/os/mock-data"
import { OSStatusBadge, OSPriorityBadge } from "@/components/byred/os/os-badge"
import { OSAvatar } from "@/components/byred/os/os-avatar"
import { cn } from "@/lib/utils"

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  href,
}: {
  label: string
  value: number | string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  accent: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors group"
    >
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", accent)}>
        <Icon className="w-5 h-5" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white font-condensed leading-none">{value}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-zinc-700 ml-auto group-hover:text-zinc-400 transition-colors" strokeWidth={1.75} />
    </Link>
  )
}

export default function OSDashboardPage() {
  const activeProjects = MOCK_PROJECTS.filter((p) => p.status === "active")
  const blockedTasks = MOCK_TASKS.filter((t) => t.blocker_flag)
  const inProgressTasks = MOCK_TASKS.filter((t) => t.status === "in_progress")
  const criticalTasks = MOCK_TASKS.filter((t) => t.priority === "critical" && t.status !== "done")
  const upcomingEvents = MOCK_CALENDAR_EVENTS.filter((e) => e.status === "upcoming").slice(0, 3)

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white font-condensed tracking-tight">
          Operations Dashboard
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          label="Active Projects"
          value={activeProjects.length}
          icon={FolderKanban}
          accent="bg-violet-900/50 text-violet-300"
          href="/os/projects"
        />
        <StatCard
          label="In Progress"
          value={inProgressTasks.length}
          icon={TrendingUp}
          accent="bg-sky-900/50 text-sky-300"
          href="/os/tasks"
        />
        <StatCard
          label="Blocked"
          value={blockedTasks.length}
          icon={AlertTriangle}
          accent="bg-red-900/50 text-red-300"
          href="/os/tasks"
        />
        <StatCard
          label="Critical Tasks"
          value={criticalTasks.length}
          icon={Clock}
          accent="bg-amber-900/50 text-amber-300"
          href="/os/tasks"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Active Projects */}
        <div className="xl:col-span-2 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              <span className="text-sm font-medium text-white">Active Projects</span>
            </div>
            <Link href="/os/projects" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1">
              All projects <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-zinc-800/60">
            {activeProjects.map((project) => {
              const pct = project.task_count > 0
                ? Math.round((project.completed_task_count / project.task_count) * 100)
                : 0
              return (
                <Link
                  key={project.id}
                  href={`/os/projects`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-white truncate">{project.name}</p>
                      <OSPriorityBadge priority={project.priority} />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#D7261E] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500 shrink-0">
                        {project.completed_task_count}/{project.task_count}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-700 shrink-0" strokeWidth={1.75} />
                </Link>
              )
            })}
          </div>
        </div>

        {/* Upcoming Events + Blocked sidebar */}
        <div className="space-y-4">
          {/* Upcoming */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
              <Calendar className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              <span className="text-sm font-medium text-white">Upcoming</span>
            </div>
            <div className="divide-y divide-zinc-800/60">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span
                      className="w-2 h-2 rounded-full mt-1 shrink-0"
                      style={{ backgroundColor: event.calendar_color ?? "#71717a" }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-200 truncate">{event.title}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        {new Date(event.start_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric",
                        })}
                        {!event.all_day && " · " + new Date(event.start_at).toLocaleTimeString("en-US", {
                          hour: "numeric", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-zinc-800">
              <Link href="/os/calendar" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                View calendar
              </Link>
            </div>
          </div>

          {/* Blocked tasks */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
              <AlertTriangle className="w-4 h-4 text-red-400" strokeWidth={1.75} />
              <span className="text-sm font-medium text-white">Blockers</span>
              {blockedTasks.length > 0 && (
                <span className="ml-auto text-[10px] font-bold text-red-400 bg-red-950 border border-red-800 px-1.5 py-0.5 rounded">
                  {blockedTasks.length}
                </span>
              )}
            </div>
            {blockedTasks.length === 0 ? (
              <p className="text-xs text-zinc-600 px-4 py-4">No active blockers.</p>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {blockedTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/os/tasks/${task.id}`}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-white/3 transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" strokeWidth={1.75} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-200 truncate">{task.title}</p>
                      {task.blocker_reason && (
                        <p className="text-[10px] text-zinc-600 truncate mt-0.5">{task.blocker_reason}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Team */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
              <Users className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              <span className="text-sm font-medium text-white">Team</span>
            </div>
            <div className="px-4 py-3 space-y-2">
              {MOCK_TEAM.map((member) => (
                <div key={member.id} className="flex items-center gap-2.5">
                  <OSAvatar name={member.name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-300 truncate">{member.name}</p>
                    <p className="text-[10px] text-zinc-600">{member.task_count} tasks</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-zinc-800">
              <Link href="/os/team" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                View team
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Recent tasks */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
            <span className="text-sm font-medium text-white">Recent Tasks</span>
          </div>
          <Link href="/os/tasks" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1">
            All tasks <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-zinc-800/60">
          {MOCK_TASKS.slice(0, 5).map((task) => (
            <Link
              key={task.id}
              href={`/os/tasks/${task.id}`}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/3 transition-colors group"
            >
              <div className="flex-1 min-w-0 flex items-center gap-3">
                <OSStatusBadge status={task.status} />
                <span className="text-sm text-zinc-200 truncate group-hover:text-white transition-colors">
                  {task.title}
                </span>
                {task.blocker_flag && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <OSPriorityBadge priority={task.priority} />
                {task.owner_name && (
                  <OSAvatar name={task.owner_name} size="xs" />
                )}
                {task.due_date && (
                  <span className="text-xs text-zinc-600">
                    {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
