import { Check, RefreshCw, Ban, Circle } from "lucide-react"

type StatusKey = "done" | "in_progress" | "blocked" | "not_started" | "overdue" | "cancelled"

const STATUS_CONFIG: Record<
  StatusKey,
  {
    label: string
    bg: string
    color: string
    border: string
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  }
> = {
  done: {
    label: "Done",
    bg: "#f0faf4",
    color: "#2a7a3a",
    border: "#c8e6d0",
    icon: Check,
  },
  in_progress: {
    label: "In Progress",
    bg: "#fff8f8",
    color: "#D02C2A",
    border: "#f5c0c0",
    icon: RefreshCw,
  },
  overdue: {
    label: "Overdue",
    bg: "#fff8f8",
    color: "#D02C2A",
    border: "#f5c0c0",
    icon: RefreshCw,
  },
  blocked: {
    label: "Blocked",
    bg: "#D02C2A",
    color: "#ffffff",
    border: "#D02C2A",
    icon: Ban,
  },
  cancelled: {
    label: "Cancelled",
    bg: "#f7f7f7",
    color: "#bbbbbb",
    border: "#e8e8e8",
    icon: Circle,
  },
  not_started: {
    label: "Not Started",
    bg: "#f7f7f7",
    color: "#bbbbbb",
    border: "#e8e8e8",
    icon: Circle,
  },
}

interface StatusBadgeProps {
  status: string | null
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = (status?.toLowerCase() ?? "not_started") as StatusKey
  const config = STATUS_CONFIG[key] ?? STATUS_CONFIG.not_started
  const Icon = config.icon

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "flex-start",
        minWidth: 98,
        gap: 4,
        padding: "0 8px",
        height: 22,
        borderRadius: 2,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 0.3,
        whiteSpace: "nowrap",
        textTransform: "uppercase",
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
      }}
    >
      <Icon size={10} strokeWidth={2.25} />
      {config.label}
    </span>
  )
}
