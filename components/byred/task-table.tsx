"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { ExternalLink, Copy, Archive, Edit } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TenantPill } from "./tenant-pill"
import { StatusBadge } from "./status-badge"
import { PriorityFlag } from "./priority-flag"
import { DueDateCell } from "./due-date-cell"
import { AiModeChip } from "./ai-mode-chip"
import { OwnerAvatar } from "./owner-avatar"
import { useUser } from "@/lib/context/user-context"
import { syncActiveTenantForMutation } from "@/lib/client/sync-active-tenant"
import { updateTaskFieldsAction } from "@/lib/actions/tasks"
import type { Task } from "@/types/db"

// Column grid — must match between header and every row.
// Status | Title | Tenant | Due | Pri | Est | Owner | Mode | Menu
const GRID_COLUMNS = "108px minmax(0, 1fr) 130px 58px 32px 40px 80px 66px 28px"

function formatMinutes(minutes: number | null): string {
  if (!minutes) return "—"
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

interface TaskTableProps {
  tasks: Task[]
}

export function TaskTable({ tasks }: TaskTableProps) {
  const router = useRouter()
  const currentUser = useUser()
  const { activeTenantId, setActiveTenantId } = currentUser
  const [archivingId, setArchivingId] = useState<string | null>(null)

  async function handleArchive(task: Task) {
    setArchivingId(task.id)
    try {
      await syncActiveTenantForMutation(
        setActiveTenantId,
        activeTenantId,
        task.tenant_id
      )
      const result = await updateTaskFieldsAction({
        taskId: task.id,
        tenantId: task.tenant_id,
        status: "cancelled",
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Task archived.")
      router.refresh()
    } catch {
      toast.error("Could not archive task.")
    } finally {
      setArchivingId(null)
    }
  }

  if (tasks.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{ padding: "64px 24px", textAlign: "center" }}
      >
        <p
          style={{ fontSize: 13, fontWeight: 500, color: "#aaaaaa" }}
        >
          No tasks.
        </p>
        <p style={{ fontSize: 11, color: "#cccccc", marginTop: 4 }}>
          Create one to start.
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "14px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        background: "#f7f7f7",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: GRID_COLUMNS,
          alignItems: "center",
          height: 32,
          padding: "0 14px",
          fontSize: 9,
          fontWeight: 700,
          color: "#cccccc",
          textTransform: "uppercase",
          letterSpacing: 1,
          position: "sticky",
          top: 0,
          background: "#f7f7f7",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Status
        </div>
        <div style={{ display: "flex", alignItems: "center", paddingRight: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
          Title
        </div>
        <div style={{ display: "flex", alignItems: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Tenant
        </div>
        <div style={{ display: "flex", alignItems: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Due
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          Pri
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: 6,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          Est
        </div>
        <div style={{ display: "flex", alignItems: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Owner
        </div>
        <div style={{ display: "flex", alignItems: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Mode
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        />
      </div>

      {/* Rows */}
      {tasks.map((task) => {
        const isDone = task.status === "done"
        const urgent =
          task.blocker_flag ||
          task.status === "overdue" ||
          task.status === "blocked"

        return (
          <div
            key={task.id}
            style={{
              display: "grid",
              gridTemplateColumns: GRID_COLUMNS,
              alignItems: "center",
              height: 46,
              padding: urgent ? "0 14px 0 11px" : "0 14px",
              background: "#ffffff",
              border: "1px solid #ebebeb",
              borderLeft: urgent ? "3px solid #D02C2A" : "1px solid #ebebeb",
              borderRadius: 3,
              overflow: "hidden",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#dddddd"
              if (urgent) e.currentTarget.style.borderLeftColor = "#D02C2A"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#ebebeb"
              if (urgent) e.currentTarget.style.borderLeftColor = "#D02C2A"
            }}
          >
            {/* Status */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <StatusBadge status={task.status} />
            </div>

            {/* Title */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                paddingRight: 8,
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <Link
                href={`/tasks/${task.id}`}
                style={{
                  display: "block",
                  fontSize: 12,
                  color: isDone ? "#bbbbbb" : "#111111",
                  textDecoration: isDone ? "line-through" : "none",
                  textDecorationColor: "#dddddd",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  width: "100%",
                }}
              >
                {task.title}
              </Link>
            </div>

            {/* Tenant */}
            <div className="cell-tenant" style={{ display: "flex", alignItems: "center", overflow: "hidden", minWidth: 0 }}>
              <TenantPill tenantId={task.tenant_id} />
            </div>

            {/* Due */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <DueDateCell dueDate={task.due_date} />
            </div>

            {/* Priority */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PriorityFlag priority={task.priority} />
            </div>

            {/* Est */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingRight: 6,
                fontSize: 10,
                color: "#cccccc",
              }}
            >
              {formatMinutes(task.estimated_minutes)}
            </div>

            {/* Owner */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <OwnerAvatar ownerId={task.owner_user_id} size="sm" showName />
            </div>

            {/* Mode */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <AiModeChip mode={task.ai_mode} />
            </div>

            {/* Menu */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                flexShrink: 0,
              }}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Task actions"
                    style={{
                      width: 28,
                      height: 24,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 2,
                      border: "none",
                      background: "transparent",
                      color: "#dddddd",
                      cursor: "pointer",
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#888888"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#dddddd"
                    }}
                  >
                    ⋯
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e8e8e8",
                    borderRadius: 2,
                  }}
                >
                  <DropdownMenuItem asChild style={{ fontSize: 11 }}>
                    <Link href={`/tasks/${task.id}`}>
                      <Edit size={12} strokeWidth={1.75} />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild style={{ fontSize: 11 }}>
                    <Link href={`/tasks/${task.id}`}>
                      <ExternalLink size={12} strokeWidth={1.75} />
                      Open
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    style={{ fontSize: 11 }}
                    onClick={() =>
                      navigator.clipboard.writeText(
                        `${window.location.origin}/tasks/${task.id}`
                      )
                    }
                  >
                    <Copy size={12} strokeWidth={1.75} />
                    Copy link
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    style={{ fontSize: 11 }}
                    disabled={
                      archivingId === task.id || task.status === "cancelled"
                    }
                    onClick={(e) => {
                      e.preventDefault()
                      void handleArchive(task)
                    }}
                  >
                    <Archive size={12} strokeWidth={1.75} />
                    {archivingId === task.id ? "Archiving…" : "Archive"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )
      })}
    </div>
  )
}
