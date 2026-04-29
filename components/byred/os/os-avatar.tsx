"use client"

import { cn } from "@/lib/utils"

const COLORS = [
  "bg-red-900 text-red-300",
  "bg-sky-900 text-sky-300",
  "bg-emerald-900 text-emerald-300",
  "bg-amber-900 text-amber-300",
  "bg-violet-900 text-violet-300",
]

function colorFromName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

type OSAvatarProps = {
  name: string
  size?: "xs" | "sm" | "md"
  className?: string
}

export function OSAvatar({ name, size = "sm", className }: OSAvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const sizeClass = {
    xs: "w-5 h-5 text-[9px]",
    sm: "w-6 h-6 text-[10px]",
    md: "w-8 h-8 text-xs",
  }[size]

  return (
    <div className={cn(
      "rounded-full flex items-center justify-center font-semibold shrink-0 border border-white/5",
      colorFromName(name), sizeClass, className
    )}>
      {initials}
    </div>
  )
}
