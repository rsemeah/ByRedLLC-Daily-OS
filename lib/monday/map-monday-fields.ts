import "server-only"

import type { TaskPriority, TaskStatus } from "@/types/db"

/**
 * Map a free-form Monday status label onto our bounded `TaskStatus` enum.
 * Returns `null` for labels we do not recognize so callers can fall back to
 * the existing row value instead of corrupting it with a bad default.
 */
export function mapMondayStatus(label: string | null | undefined): TaskStatus | null {
  if (!label) return null
  const l = label.trim().toLowerCase()

  if (!l) return null

  if (l === "done" || l === "complete" || l === "completed") return "done"
  if (l === "cancelled" || l === "canceled" || l === "archived") return "cancelled"
  if (
    l === "working on it" ||
    l === "in progress" ||
    l === "in-progress" ||
    l === "in_progress" ||
    l === "doing"
  ) return "in_progress"
  if (l === "stuck" || l === "blocked" || l === "blocker") return "blocked"
  if (l === "overdue" || l === "late" || l === "past due") return "overdue"
  if (l === "not started" || l === "not_started" || l === "to do" || l === "todo" || l === "backlog")
    return "not_started"

  return null
}

/**
 * Map a free-form Monday priority label onto our `TaskPriority` enum.
 */
export function mapMondayPriority(label: string | null | undefined): TaskPriority | null {
  if (!label) return null
  const l = label.trim().toLowerCase()
  if (!l) return null

  if (l === "critical" || l === "urgent" || l === "highest" || l === "p0") return "critical"
  if (l === "high" || l === "p1") return "high"
  if (l === "medium" || l === "mid" || l === "p2" || l === "normal") return "medium"
  if (l === "low" || l === "p3" || l === "later") return "low"

  return null
}
