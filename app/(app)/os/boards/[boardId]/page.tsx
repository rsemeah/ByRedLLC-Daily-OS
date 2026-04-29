"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft, MessageSquare, Clock, AlertTriangle, Plus } from "lucide-react"
import {
  MOCK_BOARDS,
  MOCK_TASKS,
  MOCK_PROJECTS,
  type OSTask,
} from "@/components/byred/os/mock-data"
import { OSStatusBadge, OSPriorityBadge, OSBlockerBadge } from "@/components/byred/os/os-badge"
import { OSAvatar } from "@/components/byred/os/os-avatar"
import { OSEmpty } from "@/components/byred/os/os-empty"
import { cn } from "@/lib/utils"

const KANBAN_COLUMNS = [
  { id: "not_started", label: "Not Started", color: "border-zinc-700" },
  { id: "in_progress", label: "In Progress", color: "border-sky-700" },
  { id: "blocked",     label: "Blocked",     color: "border-red-700" },
  { id: "done",        label: "Done",        color: "border-emerald-700" },
]

function TaskCard({ task }: { task: OSTask }) {
  return (
    <Link
      href={`/os/tasks/${task.id}`}
      className={cn(
        "block p-3.5 rounded-lg bg-zinc-800/80 border border-zinc-700/60 hover:border-zinc-600 transition-colors group",
        task.blocker_flag && "border-red-800/60 bg-red-950/20"
      )}
    >
      {/* Blocker indicator */}
      {task.blocker_flag && (
        <div className="flex items-center gap-1.5 mb-2">
          <AlertTriangle className="w-3 h-3 text-red-400" strokeWidth={2} />
          <span className="text-[10px] text-red-400 font-medium truncate">{task.blocker_reason}</span>
        </div>
      )}

      {/* Title */}
      <p className="text-xs font-medium text-zinc-200 group-hover:text-white leading-relaxed mb-2.5">
        {task.title}
      </p>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <OSPriorityBadge priority={task.priority} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] text-zinc-600">
          {task.due_date && (
            <div className={cn(
              "flex items-center gap-1",
              new Date(task.due_date) < new Date() && task.status !== "done" && "text-red-400"
            )}>
              <Clock className="w-3 h-3" strokeWidth={1.75} />
              {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          )}
          {task.comment_count > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" strokeWidth={1.75} />
              {task.comment_count}
            </div>
          )}
        </div>
        {task.owner_name && (
          <OSAvatar name={task.owner_name} size="xs" />
        )}
      </div>
    </Link>
  )
}

export default function OSBoardDetailPage({
  params,
}: {
  params: Promise<{ boardId: string }>
}) {
  const { boardId } = use(params)
  const board = MOCK_BOARDS.find((b) => b.id === boardId)
  const project = board ? MOCK_PROJECTS.find((p) => p.id === board.project_id) : null
  const tasks = MOCK_TASKS.filter((t) => t.board_id === boardId)

  if (!board) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-500 text-sm">Board not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/os/boards"
          className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-zinc-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {project && (
              <span className="text-xs text-zinc-600">{project.name}</span>
            )}
            {project && <span className="text-zinc-700">/</span>}
            <h1 className="text-base font-semibold text-white">{board.name}</h1>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{tasks.length} tasks</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors">
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          Add Task
        </button>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id)
          return (
            <div key={col.id} className="flex-shrink-0 w-72">
              {/* Column header */}
              <div className={cn("flex items-center justify-between mb-3 pb-2 border-b", col.color)}>
                <span className="text-xs font-semibold text-zinc-300">{col.label}</span>
                <span className="text-xs text-zinc-600 font-mono">{colTasks.length}</span>
              </div>
              {/* Cards */}
              <div className="space-y-2">
                {colTasks.length === 0 ? (
                  <div className="h-20 rounded-lg border border-dashed border-zinc-800 flex items-center justify-center">
                    <span className="text-[10px] text-zinc-700">Empty</span>
                  </div>
                ) : (
                  colTasks.map((task) => <TaskCard key={task.id} task={task} />)
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
