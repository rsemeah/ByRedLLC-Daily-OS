"use client"

import Image from "next/image"
import { useUser } from "@/lib/context/user-context"
import { cn } from "@/lib/utils"

type Size = "xs" | "sm" | "md" | "lg"

const SIZE_PX: Record<Size, number> = {
  xs: 20,
  sm: 24,
  md: 28,
  lg: 36,
}

const SIZE_TEXT: Record<Size, string> = {
  xs: "text-[9px]",
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
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
  /** Optional override — useful on settings screens where we know the row. */
  user?: {
    id: string
    name: string | null
    avatar_url: string | null
  }
}

/**
 * Small assignee chip — avatar image when we have one, initials bubble
 * when we don't. Mirrors Monday's per-task owner indicator.
 *
 * Looks owner info up from the directory shipped via TenantProvider so
 * each row doesn't trigger a network fetch.
 */
export function OwnerAvatar({
  ownerId,
  size = "sm",
  showName = false,
  className,
  user,
}: Props) {
  const { directoryById } = useUser()
  const resolved =
    user ??
    (ownerId ? directoryById.get(ownerId) : undefined) ??
    null

  if (!resolved) {
    return (
      <span className={cn("text-xs text-zinc-400", className)}>—</span>
    )
  }

  const px = SIZE_PX[size]
  const displayName = resolved.name?.trim() || "User"
  const initials = computeInitials(displayName)
  const firstName = displayName.split(" ")[0] ?? displayName

  const bubble = resolved.avatar_url ? (
    <span
      className="relative inline-block rounded-full overflow-hidden bg-zinc-100 shrink-0"
      style={{ width: px, height: px }}
    >
      <Image
        src={resolved.avatar_url}
        alt={displayName}
        width={px}
        height={px}
        className="object-cover"
        unoptimized
      />
    </span>
  ) : (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-byred-red/10 border border-byred-red/20 shrink-0 font-semibold font-condensed text-byred-red",
        SIZE_TEXT[size]
      )}
      style={{ width: px, height: px }}
      aria-label={displayName}
    >
      {initials}
    </span>
  )

  if (!showName) {
    return (
      <span
        className={cn("inline-flex items-center", className)}
        title={displayName}
      >
        {bubble}
      </span>
    )
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {bubble}
      <span className="text-xs text-zinc-600 truncate max-w-[6.5rem]">
        {firstName}
      </span>
    </span>
  )
}
