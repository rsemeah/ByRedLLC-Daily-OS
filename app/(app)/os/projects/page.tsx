"use client"

import Link from "next/link"
import { useState } from "react"
import { FolderKanban, Plus, ArrowRight, Search } from "lucide-react"
import { MOCK_PROJECTS } from "@/components/byred/os/mock-data"
import { OSStatusBadge, OSPriorityBadge } from "@/components/byred/os/os-badge"
import { OSAvatar } from "@/components/byred/os/os-avatar"
import { OSEmpty } from "@/components/byred/os/os-empty"
import { cn } from "@/lib/utils"
import { MOCK_TEAM } from "@/components/byred/os/mock-data"

const TENANT_COLORS: Record<string, string> = {
  hirewire: "bg-[#3355bb]/20 text-[#6688ee] border border-[#3355bb]/30",
  byred:    "bg-red-950/60 text-red-300 border border-red-800/40",
  paradise: "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40",
  hadith:   "bg-amber-950/60 text-amber-300 border border-amber-800/40",
}

function ownerName(ownerId: string | null) {
  if (!ownerId) return null
  return MOCK_TEAM.find((m) => m.id === ownerId)?.name ?? null
}

export default function OSProjectsPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filtered = MOCK_PROJECTS.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-condensed tracking-tight">Projects</h1>
          <p className="text-sm text-zinc-500 mt-1">{MOCK_PROJECTS.length} total across all tenants</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#D7261E] text-white text-sm font-medium hover:bg-[#B51E18] transition-colors">
          <Plus className="w-4 h-4" strokeWidth={2} />
          New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>
        {["all", "active", "paused", "completed", "archived"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors",
              statusFilter === s
                ? "bg-white/10 text-white border border-white/15"
                : "text-zinc-500 hover:text-zinc-300 border border-transparent"
            )}
          >
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      {/* Project cards */}
      {filtered.length === 0 ? (
        <OSEmpty
          icon={FolderKanban}
          title="No projects found"
          description="Try adjusting your search or filters."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((project) => {
            const pct = project.task_count > 0
              ? Math.round((project.completed_task_count / project.task_count) * 100)
              : 0
            const owner = ownerName(project.owner_user_id)
            const tenantClass = TENANT_COLORS[project.tenant_id] ?? "bg-zinc-800 text-zinc-400 border border-zinc-700"

            return (
              <div
                key={project.id}
                className="rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors overflow-hidden"
              >
                {/* Top row */}
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={cn("inline-flex px-2 py-0.5 rounded text-[10px] font-medium", tenantClass)}>
                          {project.tenant_id}
                        </span>
                        <OSPriorityBadge priority={project.priority} />
                        <OSStatusBadge status={project.status} />
                      </div>
                      <h3 className="text-sm font-semibold text-white">{project.name}</h3>
                      {project.description && (
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{project.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-600">Progress</span>
                      <span className="text-[10px] text-zinc-500">
                        {project.completed_task_count}/{project.task_count} tasks · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#D7261E] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800 bg-black/20">
                  <div className="flex items-center gap-4 text-xs text-zinc-600">
                    {owner && (
                      <div className="flex items-center gap-1.5">
                        <OSAvatar name={owner} size="xs" />
                        <span>{owner.split(" ")[0]}</span>
                      </div>
                    )}
                    {project.due_date && (
                      <span>
                        Due {new Date(project.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                    <span>{project.board_count} boards</span>
                  </div>
                  <Link
                    href={`/os/boards`}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    View boards <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
