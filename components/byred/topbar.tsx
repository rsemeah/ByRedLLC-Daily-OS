"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Bell, Settings, FileText, AlertTriangle } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { DailyBriefSummary } from "@/types/database"

const ROUTE_META: Record<
  string,
  { title: string; subtitle: string; createHref?: string; createLabel?: string }
> = {
  "/": {
    title: "Command Center",
    subtitle: "Ops overview",
  },
  "/today": {
    title: "Today",
    subtitle: "Tasks due today",
  },
  "/tasks": {
    title: "Tasks",
    subtitle: "All team tasks across tenants",
    createHref: "/tasks/new",
    createLabel: "+ Create Task",
  },
  "/leads": {
    title: "Leads",
    subtitle: "Pipeline and follow-ups",
    createHref: "/leads/new",
    createLabel: "+ New Lead",
  },
  "/activities": {
    title: "Activities",
    subtitle: "System event log",
  },
  "/tenants": {
    title: "Tenants",
    subtitle: "Workspace roster",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Account + workspace",
  },
}

const DEFAULT_BRIEF: DailyBriefSummary = {
  headline: "No brief generated yet",
  top_3: [],
  warnings: [],
  next_action: "Check back later for your daily brief",
  verification_notes: ["MISSING: No generated brief is stored for today."],
}

export type AppTopbarProps = {
  initialBrief?: DailyBriefSummary
  initialBriefDate?: string | null
}

export function AppTopbar({
  initialBrief,
  initialBriefDate = null,
}: AppTopbarProps) {
  const pathname = usePathname()
  const [briefOpen, setBriefOpen] = useState(false)
  const [brief] = useState<DailyBriefSummary>(initialBrief ?? DEFAULT_BRIEF)
  const [briefDate] = useState<string | null>(initialBriefDate)

  // Pick the most specific known route meta for the current path.
  const meta =
    Object.entries(ROUTE_META)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([path]) =>
        path === "/" ? pathname === "/" : pathname.startsWith(path)
      )?.[1] ?? { title: "ByRed OS", subtitle: "" }

  const formattedDate = briefDate
    ? new Date(briefDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Today"

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center justify-between"
      style={{
        left: 210,
        height: 60,
        padding: "0 24px",
        background: "#ffffff",
        borderBottom: "1px solid #ebebeb",
        boxShadow: "0 1px 0 0 rgba(0,0,0,0.04)",
      }}
    >
      {/* Left: title + subtitle */}
      <div>
        <h1
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#0a0a0a",
            letterSpacing: "-0.2px",
            lineHeight: 1,
          }}
        >
          {meta.title}
        </h1>
        {meta.subtitle && (
          <p
            style={{
              fontSize: 10,
              color: "#999999",
              marginTop: 3,
              lineHeight: 1,
            }}
          >
            {meta.subtitle}
          </p>
        )}
      </div>

      {/* Right: icon buttons + create */}
      <div className="flex items-center" style={{ gap: 10 }}>
        {/* Brief popover lives on the Bell */}
        <Popover open={briefOpen} onOpenChange={setBriefOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Daily Brief"
              className="inline-flex items-center justify-center transition-colors"
              style={{
                width: 30,
                height: 30,
                background: "transparent",
                border: "1px solid #e4e4e7",
                borderRadius: 4,
                color: "#a1a1aa",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#0a0a0a"
                e.currentTarget.style.borderColor = "#a1a1aa"
                e.currentTarget.style.background = "#f4f4f5"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#a1a1aa"
                e.currentTarget.style.borderColor = "#e4e4e7"
                e.currentTarget.style.background = "transparent"
              }}
            >
              <Bell size={14} strokeWidth={1.75} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 p-0"
            align="end"
            style={{
              background: "#ffffff",
              border: "1px solid #e8e8e8",
              borderRadius: 2,
            }}
          >
            <div
              style={{
                padding: 16,
                borderBottom: "1px solid #ebebeb",
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  color: "#bbbbbb",
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                Daily Brief · {formattedDate}
              </p>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#111111",
                  lineHeight: 1.4,
                }}
              >
                {brief.headline}
              </p>
            </div>
            <div style={{ padding: 16 }}>
              {brief.top_3.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p
                    style={{
                      fontSize: 9,
                      color: "#bbbbbb",
                      textTransform: "uppercase",
                      letterSpacing: 2,
                      marginBottom: 8,
                      fontWeight: 700,
                    }}
                  >
                    Top 3
                  </p>
                  <ol style={{ listStyle: "none", padding: 0 }}>
                    {brief.top_3.map((item, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          gap: 8,
                          fontSize: 11,
                          color: "#111111",
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            color: "#D02C2A",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {i + 1}.
                        </span>
                        {typeof item === "string" ? item : item.title}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {brief.warnings.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p
                    style={{
                      fontSize: 9,
                      color: "#bbbbbb",
                      textTransform: "uppercase",
                      letterSpacing: 2,
                      marginBottom: 8,
                      fontWeight: 700,
                    }}
                  >
                    Warnings
                  </p>
                  {brief.warnings.map((w, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 6,
                        fontSize: 11,
                        color: "#aa5500",
                        marginBottom: 4,
                      }}
                    >
                      <AlertTriangle size={12} strokeWidth={1.75} />
                      {w}
                    </div>
                  ))}
                </div>
              )}
              <div
                style={{
                  paddingTop: 8,
                  borderTop: "1px solid #ebebeb",
                }}
              >
                <p
                  style={{
                    fontSize: 9,
                    color: "#bbbbbb",
                    textTransform: "uppercase",
                    letterSpacing: 2,
                    marginBottom: 4,
                    fontWeight: 700,
                  }}
                >
                  Next Action
                </p>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#111111" }}>
                  {brief.next_action}
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Link
          href="/settings"
          aria-label="Settings"
          className="inline-flex items-center justify-center transition-colors"
          style={{
            width: 30,
            height: 30,
            background: "transparent",
            border: "1px solid #e4e4e7",
            borderRadius: 4,
            color: "#a1a1aa",
          }}
        >
          <Settings size={14} strokeWidth={1.75} />
        </Link>

        {meta.createHref && (
          <Link
            href={meta.createHref}
            className="inline-flex items-center justify-center uppercase transition-colors"
            style={{
              height: 32,
              padding: "0 16px",
              background: "#D02C2A",
              color: "#ffffff",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              borderRadius: 2,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#A02220"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#D02C2A"
            }}
          >
            {meta.createLabel ?? "+ Create"}
          </Link>
        )}

        {/* Brief shortcut (kept inline so Daily Brief stays reachable from topbar) */}
        <button
          type="button"
          onClick={() => setBriefOpen((o) => !o)}
          aria-label="Toggle Daily Brief"
          className="inline-flex items-center justify-center transition-colors"
          style={{
            width: 30,
            height: 30,
            background: "transparent",
            border: "1px solid #e4e4e7",
            borderRadius: 4,
            color: "#a1a1aa",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#0a0a0a"
            e.currentTarget.style.borderColor = "#a1a1aa"
            e.currentTarget.style.background = "#f4f4f5"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#a1a1aa"
            e.currentTarget.style.borderColor = "#e4e4e7"
            e.currentTarget.style.background = "transparent"
          }}
        >
          <FileText size={14} strokeWidth={1.75} />
        </button>
      </div>
    </header>
  )
}
