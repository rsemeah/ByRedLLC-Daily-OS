"use client"

import { useSidebar } from "@/lib/context/sidebar-context"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export function AppLayoutClient({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar()
  const isMobile = useIsMobile()

  return (
    <div
      className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        isMobile ? "ml-0" : isCollapsed ? "ml-16" : "ml-60"
      )}
    >
      {children}
    </div>
  )
}
