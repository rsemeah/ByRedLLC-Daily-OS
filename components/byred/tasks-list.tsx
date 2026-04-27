"use client"

import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { TaskTable } from "@/components/byred/task-table"
import { useUser } from "@/lib/context/user-context"
import type { Task } from "@/types/db"

type ChipKey = "my" | "overdue" | "week" | "blocked"

const CHIPS: { key: ChipKey; label: string }[] = [
  { key: "my", label: "Mine" },
  { key: "overdue", label: "Overdue" },
  { key: "week", label: "This Week" },
  { key: "blocked", label: "Blocked" },
]

interface TasksListProps {
  initialTasks: Task[]
  lockedTenantId?: string | null
}

export function TasksList({ initialTasks, lockedTenantId = null }: TasksListProps) {
  const currentUser = useUser()
  const currentProfileId = currentUser.profile?.id ?? null
  const [search, setSearch] = useState("")
  const [activeChip, setActiveChip] = useState<ChipKey | null>(null)

  function toggleChip(key: ChipKey) {
    setActiveChip((prev) => (prev === key ? null : key))
  }

  const filtered = useMemo(() => {
    let tasks = [...initialTasks]

    if (search) {
      const q = search.toLowerCase()
      tasks = tasks.filter((t) => t.title.toLowerCase().includes(q))
    }

    if (activeChip === "my" && currentProfileId) {
      tasks = tasks.filter((t) => t.owner_user_id === currentProfileId)
    } else if (activeChip === "overdue") {
      tasks = tasks.filter((t) => t.status === "overdue")
    } else if (activeChip === "blocked") {
      tasks = tasks.filter((t) => t.status === "blocked" || t.blocker_flag)
    } else if (activeChip === "week") {
      const now = new Date()
      const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      tasks = tasks.filter((t) => {
        if (!t.due_date) return false
        const due = new Date(t.due_date)
        return due >= now && due <= inOneWeek
      })
    }

    return tasks
  }, [initialTasks, search, activeChip, currentProfileId])

  // Footer stats are driven by the unfiltered scope (locked-tenant or all)
  // so the numbers stay stable while you toggle filter chips.
  const stats = useMemo(() => {
    const scope = lockedTenantId
      ? initialTasks.filter((t) => t.tenant_id === lockedTenantId)
      : initialTasks
    return {
      total: scope.length,
      overdue: scope.filter((t) => t.status === "overdue").length,
      inProgress: scope.filter((t) => t.status === "in_progress").length,
      done: scope.filter((t) => t.status === "done").length,
      notStarted: scope.filter((t) => t.status === "not_started").length,
    }
  }, [initialTasks, lockedTenantId])

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* FilterBar */}
      <div
        className="flex items-center"
        style={{
          height: 60,
          padding: "0 24px",
          gap: 10,
          background: "#ffffff",
          borderBottom: "1px solid #ebebeb",
          overflow: "hidden",
          flexWrap: "nowrap",
        }}
      >
        <label
          className="flex items-center"
          style={{
            width: 280,
            height: 36,
            flexShrink: 0,
            padding: "0 12px",
            gap: 8,
            background: "#fafafa",
            border: "1px solid #ececec",
            borderRadius: 4,
          }}
        >
          <Search size={14} strokeWidth={1.75} color="#bbbbbb" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 12,
              color: "#111111",
            }}
          />
        </label>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          {CHIPS.map((chip) => {
            const active = activeChip === chip.key
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => toggleChip(chip.key)}
                style={{
                  height: 32,
                  padding: "0 14px",
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 4,
                  flexShrink: 0,
                  background: active ? "#111111" : "#ffffff",
                  border: `1px solid ${active ? "#111111" : "#ececec"}`,
                  color: active ? "#ffffff" : "#666666",
                  cursor: "pointer",
                  transition: "background 120ms, border-color 120ms, color 120ms",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = "#cccccc"
                    e.currentTarget.style.color = "#111111"
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = "#ececec"
                    e.currentTarget.style.color = "#666666"
                  }
                }}
              >
                {chip.label}
              </button>
            )
          })}
        </div>

        <span
          style={{
            marginLeft: "auto",
            flexShrink: 0,
            whiteSpace: "nowrap",
            fontSize: 11,
            color: "#999999",
          }}
        >
          {filtered.length} of {initialTasks.length}
        </span>
      </div>

      {/* Table */}
      <TaskTable tasks={filtered} />

      {/* StatusFooter */}
      <div
        className="flex items-center"
        style={{
          height: 60,
          padding: "0 24px",
          background: "#ffffff",
          borderTop: "1px solid #ebebeb",
          gap: 0,
        }}
      >
        <Stat label="Total" value={stats.total} first />
        <Divider />
        <Stat label="Overdue" value={stats.overdue} tone="overdue" />
        <Divider />
        <Stat label="In Progress" value={stats.inProgress} />
        <Divider />
        <Stat label="Done" value={stats.done} tone="done" />
        <Divider />
        <Stat label="Not Started" value={stats.notStarted} />
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  tone = "default",
  first = false,
}: {
  label: string
  value: number
  tone?: "default" | "overdue" | "done"
  first?: boolean
}) {
  const color =
    tone === "overdue" ? "#D02C2A" : tone === "done" ? "#2a7a3a" : "#111111"
  return (
    <div style={{ padding: first ? "0 28px 0 0" : "0 28px" }}>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color, letterSpacing: "-0.5px" }}>
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "#999999",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginTop: 5,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
    </div>
  )
}

function Divider() {
  return (
    <span
      style={{
        width: 1,
        height: 32,
        background: "#ececec",
        display: "inline-block",
      }}
    />
  )
}
