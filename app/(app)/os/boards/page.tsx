"use client"

import { useState } from "react"
import Link from "next/link"
import { Trello, ArrowRight, CheckSquare, Trash2, X, Loader2, AlertCircle } from "lucide-react"
import { MOCK_BOARDS, MOCK_PROJECTS } from "@/components/byred/os/mock-data"
import { OSStatusBadge } from "@/components/byred/os/os-badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const BOARD_TYPE_LABELS: Record<string, string> = {
  kanban: "Kanban",
  list: "List",
  timeline: "Timeline",
}

export default function OSBoardsPage() {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [boards, setBoards] = useState(MOCK_BOARDS)

  async function handleDelete(boardId: string) {
    setDeletingId(boardId)
    setConfirmId(null)
    try {
      const res = await fetch(`/api/os/boards/${boardId}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Delete failed")
      }
      setBoards((prev) => prev.filter((b) => b.id !== boardId))
      toast.success("Board deleted.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete board. Try again.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white font-condensed tracking-tight">Boards</h1>
        <p className="text-sm text-zinc-500 mt-1">{boards.length} boards across all projects</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {boards.map((board) => {
          const project = MOCK_PROJECTS.find((p) => p.id === board.project_id)
          const isConfirming = confirmId === board.id
          const isDeleting = deletingId === board.id

          return (
            <div
              key={board.id}
              className="rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors group overflow-hidden relative"
            >
              {/* Header strip */}
              <div className="h-1 bg-[#D7261E]" />

              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
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
                  <Link
                    href={`/os/boards/${board.id}`}
                    className="shrink-0 mt-1"
                  >
                    <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors" strokeWidth={1.75} />
                  </Link>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-600 mt-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5" strokeWidth={1.75} />
                      {board.task_count} tasks
                    </div>
                    {project && (
                      <span className="truncate max-w-[100px]">{project.name}</span>
                    )}
                  </div>

                  {/* Inline delete confirm */}
                  {isConfirming ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(board.id)}
                        disabled={isDeleting}
                        className="px-2 py-1 rounded text-[10px] font-medium bg-red-900/60 text-red-400 border border-red-800/50 hover:bg-red-900 transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete"}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="p-1 rounded text-zinc-600 hover:text-zinc-400 transition-colors"
                      >
                        <X className="w-3 h-3" strokeWidth={1.75} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.preventDefault(); setConfirmId(board.id) }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-700 hover:text-red-400 transition-all"
                      aria-label="Delete board"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {boards.length === 0 && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          No boards yet. Create a project and add boards to get started.
        </div>
      )}
    </div>
  )
}
