"use client"

import { useState, useMemo } from "react"
import { Search } from "lucide-react"
import { TaskTable } from "@/components/byred/task-table"
import { useUser } from "@/lib/context/user-context"
import type { Task } from "@/types/db"

type ChipKey = "my" | "overdue" | "week" | "blocked" | "not_started"

const CHIPS: { key: ChipKey; label: string; alert: boolean }[] = [
  { key: "my", label: "My Tasks", alert: false },
  { key: "overdue", label: "Overdue", alert: true },
  { key: "week", label: "This Week", alert: false },
  { key: "blocked", label: "Blocked", alert: true },
  { key: "not_started", label: "Not Started", alert: false },
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
    } else if (activeChip === "not_started") {
      tasks = tasks.filter((t) => t.status === "not_started")
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
          height: 50,
          padding: "0 24px",
          gap: 7,
          background: "#ffffff",
          borderBottom: "1px solid #e8e8e8",
          overflow: "hidden",
          flexWrap: "nowrap",
        }}
      >
        <label
          className="flex items-center"
          style={{
            width: 160,
            height: 32,
            flexShrink: 0,
            padding: "0 12px",
            gap: 7,
            background: "#f7f7f7",
            border: "1px solid #e8e8e8",
            borderRadius: 2,
          }}
        >
          <Search size={14} strokeWidth={1.75} color="#cccccc" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 11,
              color: "#000000",
            }}
          />
        </label>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          {CHIPS.map((chip) => {
            const active = activeChip === chip.key
            const alertResting = chip.alert && !active
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => toggleChip(chip.key)}
                style={{
                  height: 28,
                  padding: "0 11px",
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: 10,
                  fontWeight: 600,
                  borderRadius: 2,
                  flexShrink: 0,
                  background: alertResting
                    ? "#fff8f8"
                    : active
                      ? "#fde8e8"
                      : "#ffffff",
                  border: `1px solid ${
                    alertResting || active ? "#f5c0c0" : "#e8e8e8"
                  }`,
                  color: alertResting || active ? "#D02C2A" : "#aaaaaa",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!active && !chip.alert) {
                    e.currentTarget.style.borderColor = "#cccccc"
                    e.currentTarget.style.color = "#555555"
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active && !chip.alert) {
                    e.currentTarget.style.borderColor = "#e8e8e8"
                    e.currentTarget.style.color = "#aaaaaa"
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
            fontSize: 10,
            color: "#bbbbbb",
          }}
        >
          More filters ▾
        </span>
      </div>

      {/* Table */}
      <TaskTable tasks={filtered} />

      {/* StatusFooter */}
      <div
        className="flex items-center"
        style={{
          height: 52,
          padding: "0 24px",
          background: "#ffffff",
          borderTop: "1px solid #e8e8e8",
          gap: 0,
        }}
      >
        <Stat label="Total Tasks" value={stats.total} first />
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
    tone === "overdue" ? "#D02C2A" : tone === "done" ? "#2a7a3a" : "#000000"
  return (
    <div style={{ padding: first ? "0 20px 0 0" : "0 20px" }}>
      <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color }}>
        {value}
      </div>
      <div
        style={{
          fontSize: 9,
          color: "#bbbbbb",
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginTop: 3,
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
        height: 30,
        background: "#e8e8e8",
        display: "inline-block",
      }}
    />
  )
}
