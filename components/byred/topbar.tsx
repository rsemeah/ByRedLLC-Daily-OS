"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Bell, ChevronRight, FileText, AlertTriangle, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useUser } from "@/lib/context/user-context"
import { useSidebar } from "@/lib/context/sidebar-context"
import { useIsMobile } from "@/hooks/use-mobile"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { DailyBriefSummary } from "@/types/database"

const ROUTE_LABELS: Record<string, string> = {
  "/": "Command Center",
  "/os": "Command Center",
  "/os/dashboard": "Command Center",
  "/os/today": "Today",
  "/os/projects": "Projects",
  "/os/boards": "Boards",
  "/os/tasks": "Tasks",
  "/os/calendar": "Calendar",
  "/os/team": "Team",
  "/os/comms": "Comms",
  "/os/import": "Import",
  "/os/import/monday": "Monday Import",
  "/os/docs": "Docs",
  "/os/crm": "CRM",
  "/os/files": "Files",
  "/os/reports": "Reports",
  "/os/ai": "AI",
  "/os/automations": "Automations",
  "/os/signals": "Signals",
  "/os/settings": "Settings",
}

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 0) return [{ label: "Command Center", href: "/" }]

  const crumbs: { label: string; href: string }[] = []
  let path = ""
  for (const seg of segments) {
    path += `/${seg}`
    const label =
      ROUTE_LABELS[path] ?? (seg.length > 12 ? `${seg.slice(0, 10)}...` : seg)
    crumbs.push({ label, href: path })
  }
  return crumbs
}

// Default brief when none exists
const DEFAULT_BRIEF: DailyBriefSummary = {
  headline: "No brief generated yet",
  top_3: [],
  warnings: [],
  next_action: "Check back later for your daily brief",
}

export function AppTopbar() {
  const pathname = usePathname()
  const currentUser = useUser()
  const { isCollapsed, toggleMobile } = useSidebar()
  const isMobile = useIsMobile()
  const [briefOpen, setBriefOpen] = useState(false)
  const [brief, setBrief] = useState<DailyBriefSummary>(DEFAULT_BRIEF)
  const [briefDate, setBriefDate] = useState<string | null>(null)
  const breadcrumbs = getBreadcrumbs(pathname)

  // Fetch today's brief on mount
  useEffect(() => {
    async function fetchBrief() {
      const supabase = createClient()
      const today = new Date().toISOString().split("T")[0]

      const { data } = await supabase
        .from("byred_daily_briefs")
        .select("summary, date")
        .eq("date", today)
        .is("user_id", null) // Global brief
        .single()

      if (data?.summary) {
        setBrief(data.summary as DailyBriefSummary)
        setBriefDate(data.date)
      }
    }

    fetchBrief()
  }, [])

  // User display info
  const displayName =
    currentUser?.profile?.name ?? currentUser?.authUser?.email ?? "User"
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const formattedDate = briefDate
    ? new Date(briefDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Today"

  return (
    <header
      className={cn(
        "fixed top-0 right-0 h-14 z-30 bg-white border-b border-zinc-200 flex items-center justify-between px-4 md:px-6 transition-all duration-300",
        isMobile ? "left-0" : isCollapsed ? "left-14" : "left-56"
      )}
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMobile}
            className="w-8 h-8 text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100 -ml-1"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" strokeWidth={1.75} />
          </Button>
        )}

        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-1.5 text-sm"
          aria-label="Breadcrumb"
        >
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight
                  className="w-3 h-3 text-zinc-400"
                  strokeWidth={1.75}
                />
              )}
              {i === breadcrumbs.length - 1 ? (
                <span className="text-zinc-800 font-medium truncate max-w-[150px] md:max-w-none">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-zinc-400 hover:text-zinc-700 transition-colors hidden md:inline"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Daily Brief */}
        <Popover open={briefOpen} onOpenChange={setBriefOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 gap-2 text-xs px-2 md:px-3"
            >
              <FileText className="w-4 h-4" strokeWidth={1.75} />
              <span className="hidden md:inline">Brief</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 bg-white border-zinc-200 p-0 shadow-md"
            align="end"
          >
            <div className="p-4 border-b border-zinc-100">
              <p className="text-xs text-zinc-400 mb-1">
                Daily Brief · {formattedDate}
              </p>
              <p className="text-sm font-medium text-zinc-800 leading-snug">
                {brief.headline}
              </p>
            </div>
            <div className="p-4 space-y-3">
              {brief.top_3.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-2">
                    Top 3
                  </p>
                  <ol className="space-y-1">
                    {brief.top_3.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-zinc-600"
                      >
                        <span className="text-byred-red font-mono font-medium shrink-0">
                          {i + 1}.
                        </span>
                        {typeof item === "string" ? item : item.title}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {brief.warnings.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-2">
                    Warnings
                  </p>
                  {brief.warnings.map((w, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-xs text-amber-600"
                    >
                      <AlertTriangle
                        className="w-3 h-3 shrink-0 mt-0.5"
                        strokeWidth={1.75}
                      />
                      {w}
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-2 border-t border-zinc-100">
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-1">
                  Next Action
                </p>
                <p className="text-sm font-medium text-zinc-800">
                  {brief.next_action}
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 w-8 h-8"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" strokeWidth={1.75} />
        </Button>

        {/* Avatar */}
        <Link
          href="/settings"
          className="w-7 h-7 rounded-full bg-byred-red/10 border border-byred-red/20 flex items-center justify-center cursor-pointer"
          aria-label="User menu"
        >
          <span className="text-xs font-semibold text-byred-red font-condensed">
            {initials}
          </span>
        </Link>
      </div>
    </header>
  )
}
