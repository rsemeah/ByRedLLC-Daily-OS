"use client"

import Link from "next/link"
import { Trello, ArrowRight, CheckSquare } from "lucide-react"
import { MOCK_BOARDS, MOCK_PROJECTS } from "@/components/byred/os/mock-data"
import { OSStatusBadge } from "@/components/byred/os/os-badge"
import { cn } from "@/lib/utils"

const BOARD_TYPE_LABELS: Record<string, string> = {
  kanban: "Kanban",
  list: "List",
  timeline: "Timeline",
}

export default function OSBoardsPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white font-condensed tracking-tight">Boards</h1>
        <p className="text-sm text-zinc-500 mt-1">{MOCK_BOARDS.length} boards across all projects</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_BOARDS.map((board) => {
          const project = MOCK_PROJECTS.find((p) => p.id === board.project_id)
          return (
            <Link
              key={board.id}
              href={`/os/boards/${board.id}`}
              className="rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors group overflow-hidden"
            >
              {/* Header strip */}
              <div className="h-1 bg-[#D7261E]" />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded border",
                        "bg-zinc-800 text-zinc-400 border-zinc-700"
                      )}>
                        {BOARD_TYPE_LABELS[board.board_type] ?? board.board_type}
                      </span>
                      <OSStatusBadge status={board.status} />
                    </div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-zinc-100">{board.name}</h3>
                    {board.description && (
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{board.description}</p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0 mt-1" strokeWidth={1.75} />
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-600 mt-4">
                  <div className="flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5" strokeWidth={1.75} />
                    {board.task_count} tasks
                  </div>
                  {project && (
                    <span className="truncate">{project.name}</span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
