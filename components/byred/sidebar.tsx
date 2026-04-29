"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { getTenantColors } from "@/lib/tenant-colors"
import { useUser } from "@/lib/context/user-context"

const WORK_NAV = [
  { label: "Command Center", href: "/dashboard" },
  { label: "Today", href: "/today" },
  { label: "Tasks", href: "/tasks" },
  { label: "Leads", href: "/leads" },
]

const SYSTEM_NAV = [
  { label: "Activities", href: "/activities" },
  { label: "Tenants", href: "/tenants" },
  { label: "Monday", href: "/integrations/monday" },
  { label: "Settings", href: "/settings" },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="uppercase"
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 2,
        color: "#444444",
        padding: "20px 18px 6px",
      }}
    >
      {children}
    </p>
  )
}

function NavItem({
  href,
  label,
  active,
}: {
  href: string
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center transition-all",
        active ? "font-semibold" : "font-normal"
      )}
      style={{
        height: 34,
        padding: active ? "0 18px 0 15px" : "0 18px",
        fontSize: 12,
        color: active ? "#ffffff" : "#666666",
        background: active ? "rgba(208,44,42,0.18)" : "transparent",
        borderLeft: active ? "2px solid #D02C2A" : "2px solid transparent",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "rgba(255,255,255,0.06)"
          e.currentTarget.style.color = "#cccccc"
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent"
          e.currentTarget.style.color = "#666666"
        }
      }}
    >
      {label}
    </Link>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const currentUser = useUser()

  async function handleTenantSwitch(tenantId: string) {
    try {
      await currentUser.setActiveTenantId(tenantId)
      router.refresh()
    } catch (error) {
      console.error("Failed to switch tenant", error)
    }
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const displayName =
    currentUser?.profile?.name ?? currentUser?.authUser?.email ?? "User"
  const displayRole = currentUser?.profile?.role ?? "member"
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside
      className="flex flex-col fixed left-0 top-0 h-screen"
      style={{
        width: 210,
        minWidth: 210,
        background: "#111111",
        borderRight: "1px solid #222222",
        zIndex: 50,
        pointerEvents: "auto",
        isolation: "isolate",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center"
        style={{
          height: 60,
          padding: "0 18px",
          borderBottom: "1px solid #222222",
        }}
      >
        <Link href="/dashboard" className="inline-flex items-center gap-2.5">
          <span
            style={{
              background: "#D02C2A",
              color: "#ffffff",
              fontWeight: 900,
              fontSize: 11,
              letterSpacing: 3,
              padding: "5px 9px",
              borderRadius: 2,
              lineHeight: 1,
            }}
          >
            BR
          </span>
          <span
            style={{
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: 0.5,
              lineHeight: 1,
            }}
          >
            Daily OS
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto">
        <SectionLabel>Work</SectionLabel>
        {WORK_NAV.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            active={isActive(item.href)}
          />
        ))}

        <SectionLabel>Tenants</SectionLabel>
        {currentUser.tenants.map((tenant) => {
          const colors = getTenantColors(tenant.id, tenant.color)
          const active = currentUser.activeTenantId === tenant.id
          return (
            <button
              key={tenant.id}
              type="button"
              onClick={() => void handleTenantSwitch(tenant.id)}
              className={cn(
                "flex items-center w-full text-left transition-all",
                active ? "font-semibold" : "font-normal"
              )}
              style={{
                height: 32,
                padding: active ? "0 18px 0 15px" : "0 18px",
                gap: 8,
                fontSize: 11,
                color: active ? "#ffffff" : "#666666",
                background: active ? "rgba(208,44,42,0.18)" : "transparent",
                borderLeft: active
                  ? "2px solid #D02C2A"
                  : "2px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)"
                  e.currentTarget.style.color = "#cccccc"
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent"
                  e.currentTarget.style.color = "#666666"
                }
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: colors.dot,
                  flexShrink: 0,
                  opacity: active ? 1 : 0.6,
                }}
              />
              <span
                className="truncate"
                style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {tenant.name}
              </span>
            </button>
          )
        })}

        <SectionLabel>System</SectionLabel>
        {SYSTEM_NAV.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            active={isActive(item.href)}
          />
        ))}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "14px 18px",
          borderTop: "1px solid #222222",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#D02C2A",
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
        <div style={{ minWidth: 0 }}>
          <p
            className="truncate"
            style={{ fontSize: 11, fontWeight: 600, color: "#ffffff" }}
          >
            {displayName}
          </p>
          <p
            className="truncate uppercase"
            style={{ fontSize: 9, color: "#555555", letterSpacing: 0.5 }}
          >
            {displayRole}
          </p>
        </div>
      </div>
    </aside>
  )
}
