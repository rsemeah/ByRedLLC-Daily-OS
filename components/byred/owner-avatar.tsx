"use client"

import Image from "next/image"
import { useUser } from "@/lib/context/user-context"

type Size = "xs" | "sm" | "md" | "lg"

const SIZE_PX: Record<Size, number> = {
  xs: 20,
  sm: 22,
  md: 28,
  lg: 36,
}

function computeInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

type Props = {
  ownerId: string | null | undefined
  size?: Size
  showName?: boolean
  className?: string
  user?: {
    id: string
    name: string | null
    avatar_url: string | null
  }
}

export function OwnerAvatar({
  ownerId,
  size = "sm",
  showName = false,
  className,
  user,
}: Props) {
  const { directoryById } = useUser()
  const resolved = user ?? (ownerId ? directoryById.get(ownerId) : undefined) ?? null

  const px = SIZE_PX[size]

  if (!resolved) {
    return (
      <span
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        <span
          style={{
            width: px,
            height: px,
            borderRadius: "50%",
            background: "#f0f0f0",
            border: "1px solid #e8e8e8",
            color: "#999999",
            fontSize: 10,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          —
        </span>
      </span>
    )
  }

  const displayName = resolved.name?.trim() || "User"
  const initials = computeInitials(displayName)
  const firstName = displayName.split(" ")[0] ?? displayName

  const bubble = resolved.avatar_url ? (
    <span
      style={{
        width: px,
        height: px,
        borderRadius: "50%",
        overflow: "hidden",
        display: "inline-block",
        background: "#f0f0f0",
        flexShrink: 0,
      }}
    >
      <Image
        src={resolved.avatar_url}
        alt={displayName}
        width={px}
        height={px}
        style={{ objectFit: "cover" }}
        unoptimized
      />
    </span>
  ) : (
    <span
      style={{
        width: px,
        height: px,
        borderRadius: "50%",
        background: "#fde8e8",
        border: "1px solid #f5c0c0",
        color: "#D02C2A",
        fontSize: 8,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
      aria-label={displayName}
    >
      {initials}
    </span>
  )

  if (!showName) {
    return (
      <span
        className={className}
        style={{ display: "inline-flex", alignItems: "center" }}
        title={displayName}
      >
        {bubble}
      </span>
    )
  }

  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, minWidth: 0 }}
    >
      {bubble}
      <span
        style={{
          fontSize: 10,
          color: "#bbbbbb",
          maxWidth: 44,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {firstName}
      </span>
    </span>
  )
}
