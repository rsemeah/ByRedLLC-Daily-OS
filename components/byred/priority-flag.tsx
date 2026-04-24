const PRIORITY_DOT: Record<string, string> = {
  critical: "#D02C2A",
  high: "#D02C2A",
  medium: "#dddddd",
  low: "#eeeeee",
}

interface PriorityFlagProps {
  priority: string | null
  className?: string
  showLabel?: boolean
}

export function PriorityFlag({
  priority,
  className,
  showLabel = false,
}: PriorityFlagProps) {
  const key = priority?.toLowerCase() ?? "medium"
  const dot = PRIORITY_DOT[key] ?? PRIORITY_DOT.medium

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
      title={priority ?? "medium"}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: dot,
          flexShrink: 0,
        }}
      />
      {showLabel && (
        <span
          style={{
            fontSize: 10,
            color: "#bbbbbb",
            textTransform: "capitalize",
          }}
        >
          {priority ?? "Medium"}
        </span>
      )}
    </span>
  )
}
