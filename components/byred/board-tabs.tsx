"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ExternalLink, RefreshCw } from "lucide-react"

export type BoardTabEntry = {
  tenantId: string
  tenantName: string
  boardId: string
  count: number
}

type BoardTabsProps = {
  tabs: BoardTabEntry[]
  activeTenantId: string | null
  totalCount: number
}

function Tab({
  href,
  label,
  count,
  active,
}: {
  href: string
  label: string
  count: number
  active: boolean
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center transition-colors whitespace-nowrap"
      style={{
        height: 44,
        padding: "0 14px",
        gap: 6,
        fontSize: 11,
        fontWeight: active ? 600 : 400,
        color: active ? "#000000" : "#bbbbbb",
        borderBottom: active ? "2px solid #D02C2A" : "2px solid transparent",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = "#555555"
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = "#bbbbbb"
      }}
    >
      {label}
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          padding: "2px 6px",
          borderRadius: 2,
          lineHeight: 1,
          background: active ? "#fde8e8" : "#f0f0f0",
          color: active ? "#D02C2A" : "#bbbbbb",
        }}
      >
        {count}
      </span>
    </Link>
  )
}

export function BoardTabs({ tabs, activeTenantId, totalCount }: BoardTabsProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [syncingTenantId, setSyncingTenantId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSync(tenantId: string) {
    setError(null)
    setSyncingTenantId(tenantId)
    try {
      const res = await fetch(`/api/sync/monday/tenant/${tenantId}`, {
        method: "POST",
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? `Sync failed (HTTP ${res.status}).`)
      }
      startTransition(() => router.refresh())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed.")
    } finally {
      setSyncingTenantId(null)
    }
  }

  const activeTab = tabs.find((t) => t.tenantId === activeTenantId) ?? null

  return (
    <>
      <div
        className="flex items-end overflow-x-auto"
        style={{
          height: 44,
          padding: "0 24px",
          background: "#ffffff",
          borderBottom: "1px solid #e8e8e8",
        }}
      >
        <Tab
          href="/tasks"
          label="All Boards"
          count={totalCount}
          active={activeTenantId === null}
        />
        {tabs.map((t) => (
          <Tab
            key={t.tenantId}
            href={`/tasks?tenant_id=${t.tenantId}`}
            label={t.tenantName}
            count={t.count}
            active={t.tenantId === activeTenantId}
          />
        ))}
      </div>

      {activeTab && (
        <div
          className="flex items-center justify-between gap-4"
          style={{
            padding: "8px 24px",
            background: "#ffffff",
            borderBottom: "1px solid #ebebeb",
          }}
        >
          <div
            className="flex items-center min-w-0"
            style={{ gap: 10, fontSize: 10, color: "#aaaaaa" }}
          >
            <span>Monday board</span>
            <code
              style={{
                padding: "2px 6px",
                background: "#f7f7f7",
                border: "1px solid #e8e8e8",
                borderRadius: 2,
                color: "#111111",
                fontSize: 10,
              }}
            >
              {activeTab.boardId}
            </code>
            <a
              href={`https://monday.com/boards/${activeTab.boardId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center"
              style={{ gap: 3, color: "#D02C2A", fontWeight: 600 }}
            >
              Open in Monday
              <ExternalLink size={11} strokeWidth={2} />
            </a>
          </div>
          <div className="flex items-center" style={{ gap: 10 }}>
            {error && (
              <span style={{ color: "#D02C2A", fontSize: 10 }}>{error}</span>
            )}
            <button
              type="button"
              disabled={syncingTenantId !== null || pending}
              onClick={() => handleSync(activeTab.tenantId)}
              className="inline-flex items-center"
              style={{
                height: 24,
                padding: "0 10px",
                gap: 5,
                background: "#ffffff",
                border: "1px solid #e8e8e8",
                borderRadius: 2,
                fontSize: 10,
                fontWeight: 600,
                color: "#aaaaaa",
                cursor:
                  syncingTenantId !== null || pending
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              <RefreshCw
                size={10}
                strokeWidth={1.75}
                className={
                  syncingTenantId === activeTab.tenantId || pending
                    ? "animate-spin"
                    : undefined
                }
              />
              {syncingTenantId === activeTab.tenantId
                ? "Syncing..."
                : pending
                  ? "Refreshing..."
                  : "Sync now"}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
