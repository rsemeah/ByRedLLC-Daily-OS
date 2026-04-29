"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useUser } from "@/lib/context/user-context"

type NavLink = { kind: "link"; label: string; href: string }
type NavSoon = { kind: "soon"; label: string }
type NavEntry = NavLink | NavSoon

const TOP_NAV: NavEntry[] = [
  { kind: "link", label: "Today", href: "/os/today" },
]

const SECTIONS: { section: string; items: NavEntry[] }[] = [
  {
    section: "Work",
    items: [
      { kind: "link", label: "Tasks", href: "/os/tasks" },
      { kind: "link", label: "Calendar", href: "/os/calendar" },
      { kind: "soon", label: "Projects" },
      { kind: "soon", label: "Boards" },
    ],
  },
  {
    section: "Team",
    items: [
      { kind: "soon", label: "Team" },
      { kind: "soon", label: "Comms" },
    ],
  },
  {
    section: "Ops",
    items: [
      { kind: "soon", label: "CRM" },
      { kind: "soon", label: "Docs" },
      { kind: "soon", label: "Files" },
      { kind: "soon", label: "Reports" },
    ],
  },
  {
    section: "Intelligence",
    items: [
      { kind: "soon", label: "AI" },
      { kind: "soon", label: "Automations" },
      { kind: "soon", label: "Signals" },
    ],
  },
  {
    section: "Config",
    items: [
      { kind: "link", label: "Settings", href: "/settings" },
      { kind: "soon", label: "Import" },
    ],
  },
]

function SoonItem({ label }: { label: string }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ height: 32, padding: "0 16px", cursor: "default" }}
    >
      <span style={{ fontSize: 12, color: "#52525B" }}>{label}</span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 0.5,
          color: "#3F3F46",
          textTransform: "uppercase",
        }}
      >
        Soon
      </span>
    </div>
  )
}

function NavItem({ entry, active }: { entry: NavLink; active: boolean }) {
  return (
    <Link
      href={entry.href}
      className="flex items-center transition-colors"
      style={{
        height: 32,
        padding: active ? "0 16px 0 14px" : "0 16px",
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        color: active ? "#FAFAFA" : "#71717A",
        background: active ? "rgba(215,38,30,0.08)" : "transparent",
        borderLeft: active ? "2px solid #D7261E" : "2px solid transparent",
        textDecoration: "none",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          ;(e.currentTarget as HTMLElement).style.color = "#A1A1AA"
          ;(e.currentTarget as HTMLElement).style.background =
            "rgba(255,255,255,0.04)"
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          ;(e.currentTarget as HTMLElement).style.color = "#71717A"
          ;(e.currentTarget as HTMLElement).style.background = "transparent"
        }
      }}
    >
      {entry.label}
    </Link>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 2,
        color: "#3F3F46",
        textTransform: "uppercase",
        padding: "14px 16px 4px",
      }}
    >
      {children}
    </p>
  )
}

export function OsSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const currentUser = useUser()

  async function handleTenantSwitch(tenantId: string) {
    try {
      await currentUser.setActiveTenantId(tenantId)
      router.refresh()
    } catch (err) {
      console.error("Failed to switch tenant", err)
    }
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/")
  }

  const displayName =
    currentUser?.profile?.name ?? currentUser?.authUser?.email ?? "User"
  const displayRole = currentUser?.profile?.role ?? "member"
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside
      className="flex flex-col fixed left-0 top-0 h-screen z-40"
      style={{
        width: 200,
        minWidth: 200,
        background: "#111112",
        borderRight: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center"
        style={{
          height: 52,
          padding: "0 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 3,
            color: "#FAFAFA",
            textTransform: "uppercase",
          }}
        >
          Daily OS
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto" style={{ paddingTop: 8 }}>
        {/* Top-level items (no section header) */}
        {TOP_NAV.map((entry) =>
          entry.kind === "link" ? (
            <NavItem key={entry.href} entry={entry} active={isActive(entry.href)} />
          ) : (
            <SoonItem key={entry.label} label={entry.label} />
          )
        )}

        {/* Tenant switcher */}
        {currentUser.tenants.length > 0 && (
          <>
            <SectionLabel>Tenants</SectionLabel>
            {currentUser.tenants.map((tenant) => {
              const active = currentUser.activeTenantId === tenant.id
              return (
                <button
                  key={tenant.id}
                  type="button"
                  onClick={() => void handleTenantSwitch(tenant.id)}
                  className="flex items-center w-full text-left transition-colors"
                  style={{
                    height: 32,
                    padding: active ? "0 16px 0 14px" : "0 16px",
                    gap: 8,
                    fontSize: 11,
                    fontWeight: active ? 600 : 400,
                    color: active ? "#FAFAFA" : "#71717A",
                    background: active ? "rgba(215,38,30,0.08)" : "transparent",
                    borderLeft: active
                      ? "2px solid #D7261E"
                      : "2px solid transparent",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      ;(e.currentTarget as HTMLElement).style.color = "#A1A1AA"
                      ;(e.currentTarget as HTMLElement).style.background =
                        "rgba(255,255,255,0.04)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      ;(e.currentTarget as HTMLElement).style.color = "#71717A"
                      ;(e.currentTarget as HTMLElement).style.background =
                        "transparent"
                    }
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: tenant.color ?? "#D7261E",
                      flexShrink: 0,
                    }}
                  />
                  <span className="truncate" style={{ flex: 1 }}>
                    {tenant.name}
                  </span>
                </button>
              )
            })}
          </>
        )}

        {/* Sectioned nav */}
        {SECTIONS.map(({ section, items }) => (
          <div key={section}>
            <SectionLabel>{section}</SectionLabel>
            {items.map((entry) =>
              entry.kind === "link" ? (
                <NavItem
                  key={entry.href}
                  entry={entry}
                  active={isActive(entry.href)}
                />
              ) : (
                <SoonItem key={entry.label} label={entry.label} />
              )
            )}
          </div>
        ))}
      </nav>

      {/* View blockers */}
      <div style={{ padding: "8px 12px 4px", flexShrink: 0 }}>
        <Link
          href="/os/tasks?filter=blocked"
          className="flex items-center justify-center w-full transition-opacity"
          style={{
            height: 30,
            background: "rgba(215,38,30,0.15)",
            border: "1px solid rgba(215,38,30,0.3)",
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
            color: "#D7261E",
            textDecoration: "none",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background =
              "rgba(215,38,30,0.22)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background =
              "rgba(215,38,30,0.15)")
          }
        >
          View blockers
        </Link>
      </div>

      {/* User block */}
      <div
        style={{
          padding: "10px 12px 12px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          gap: 9,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "#D7261E",
            color: "#ffffff",
            fontSize: 10,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {initials}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            className="truncate"
            style={{ fontSize: 11, fontWeight: 600, color: "#FAFAFA" }}
          >
            {displayName}
          </p>
          <p
            className="truncate uppercase"
            style={{ fontSize: 9, color: "#52525B", letterSpacing: 0.5 }}
          >
            {displayRole}
          </p>
        </div>
      </div>
    </aside>
  )
}
