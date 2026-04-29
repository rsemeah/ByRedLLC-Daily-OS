"use client"

import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

export function OSPlaceholderPage({
  icon: Icon,
  title,
  description,
  eta,
}: {
  icon: LucideIcon
  title: string
  description: string
  eta?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
        <Icon className="w-6 h-6 text-zinc-500" strokeWidth={1.5} />
      </div>
      <div>
        <h1 className="text-xl font-bold text-white font-condensed">{title}</h1>
        <p className="text-sm text-zinc-500 mt-1 max-w-sm">{description}</p>
      </div>
      {eta && (
        <span className="text-[11px] font-medium text-zinc-600 bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded-full uppercase tracking-widest">
          Coming Soon
        </span>
      )}
    </div>
  )
}
