"use client"

import { useUser } from "@/lib/context/user-context"
import { getTenantColors } from "@/lib/tenant-colors"

interface TenantPillProps {
  tenantId: string
  className?: string
}

export function TenantPill({ tenantId, className }: TenantPillProps) {
  const { tenants } = useUser()
  const tenant = tenants.find((t) => t.id === tenantId)
  const name = tenant?.name ?? "Unknown tenant"
  const colors = getTenantColors(tenantId)
  const boardId = tenant?.monday_board_id ?? null

  const pillStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    height: 20,
    padding: "0 8px",
    borderRadius: 2,
    fontSize: 9,
    fontWeight: 600,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
    background: colors.chipBg,
    color: colors.chipText,
    border: `1px solid ${colors.chipBorder}`,
  }

  if (!boardId) {
    return (
      <span className={className} style={pillStyle} title={name}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
          {name}
        </span>
      </span>
    )
  }

  return (
    <a
      href={`https://monday.com/boards/${boardId}`}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={pillStyle}
      title={`${name} — open Monday board ${boardId}`}
      onClick={(e) => e.stopPropagation()}
    >
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          flex: 1,
          minWidth: 0,
        }}
      >
        {name}
      </span>
    </a>
  )
}
