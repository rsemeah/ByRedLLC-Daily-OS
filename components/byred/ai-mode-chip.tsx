const MODE_CONFIG: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  HUMAN_ONLY: {
    label: "Human",
    bg: "#f7f7f7",
    color: "#cccccc",
    border: "#e8e8e8",
  },
  AI_ASSIST: {
    label: "AI · Assist",
    bg: "#f0f4ff",
    color: "#3355bb",
    border: "#d0d8f5",
  },
  AI_DRAFT: {
    label: "AI · Draft",
    bg: "#f0f4ff",
    color: "#3355bb",
    border: "#d0d8f5",
  },
  AI_EXECUTE: {
    label: "AI · Exec",
    bg: "#f0f4ff",
    color: "#3355bb",
    border: "#d0d8f5",
  },
}

interface AiModeChipProps {
  mode: string | null
  className?: string
}

export function AiModeChip({ mode, className }: AiModeChipProps) {
  if (!mode) return null
  const config = MODE_CONFIG[mode] ?? MODE_CONFIG.HUMAN_ONLY

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 20,
        padding: "0 7px",
        borderRadius: 2,
        fontSize: 9,
        fontWeight: 600,
        whiteSpace: "nowrap",
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
      }}
    >
      {config.label}
    </span>
  )
}
