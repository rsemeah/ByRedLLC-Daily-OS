"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  Users,
  Activity,
  Building2,
  LayoutGrid,
  Settings,
} from "lucide-react"
import { TENANT_COLORS, TENANT_NAMES } from "@/lib/tenant-colors"
import { useUser } from "@/lib/context/user-context"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const WORK_NAV = [
  { label: "Command Center", href: "/", icon: LayoutDashboard },
  { label: "Today", href: "/today", icon: CalendarDays },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Leads", href: "/leads", icon: Users },
]

const SYSTEM_NAV = [
  { label: "Activities", href: "/activities", icon: Activity },
  { label: "Tenants", href: "/tenants", icon: Building2 },
  { label: "Monday", href: "/integrations/monday", icon: LayoutGrid },
  { label: "Settings", href: "/settings", icon: Settings },
]

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors relative",
        active
          ? "text-zinc-900 bg-zinc-100 border-l-2 border-byred-red -ml-px pl-[11px] font-medium"
          : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
      <span>{label}</span>
    </Link>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const currentUser = useUser()
  async function handleTenantSwitch(tenantId: string) {
    try {
      await currentUser.setActiveTenantId(tenantId)
    } catch (error) {
      console.error("Failed to switch tenant", error)
    }
  }


  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  // Get user display info from profile or auth user
  const displayName = currentUser?.profile?.name ?? currentUser?.authUser?.email ?? "User"
  const displayRole = currentUser?.profile?.role ?? "member"
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside className="w-60 shrink-0 flex flex-col h-screen bg-white border-r border-zinc-200 fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-5 border-b border-zinc-200">
        <Link href="/" className="flex items-center">
          <Image
            src="/brand/by-red-logo.png"
            alt="By Red, LLC."
            width={120}
            height={48}
            className="object-contain"
            priority
          />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {/* Work */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-zinc-400 uppercase px-3 mb-2">
            Work
          </p>
          <div className="space-y-0.5">
            {WORK_NAV.map((item) => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
          </div>
        </div>

        {/* Tenants */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-zinc-400 uppercase px-3 mb-2">
            Tenants
          </p>
          {currentUser.tenants.length > 1 && (
            <div className="px-3 mb-2">
              <Select
                value={currentUser.activeTenantId ?? undefined}
                onValueChange={(value) => {
                  void handleTenantSwitch(value)
                }}
              >
                <SelectTrigger className="h-8 text-xs border-zinc-200 bg-white">
                  <SelectValue placeholder="Switch tenant" />
                </SelectTrigger>
                <SelectContent>
                  {currentUser.tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id} className="text-xs">
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-0.5">
            {currentUser.tenants.map((tenant) => {
              const colors = TENANT_COLORS[tenant.id]
              const fallbackName = TENANT_NAMES[tenant.id]
              const name = tenant.name ?? fallbackName ?? tenant.id
              const active = currentUser.activeTenantId === tenant.id
              return (
                <Link
                  key={tenant.id}
                  href={`/tasks?tenant_id=${tenant.id}`}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                    active
                      ? "text-zinc-900 bg-zinc-100 font-medium"
                      : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
                  )}
                >
                  <span
                    className={cn("w-2 h-2 rounded-full shrink-0", colors?.dot)}
                    style={!colors?.dot ? { backgroundColor: tenant.color } : undefined}
                  />
                  <span className="truncate text-xs">{name}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* System */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-zinc-400 uppercase px-3 mb-2">
            System
          </p>
          <div className="space-y-0.5">
            {SYSTEM_NAV.map((item) => (
              <NavItem key={item.href} {...item} active={isActive(item.href)} />
            ))}
          </div>
        </div>
      </nav>

      {/* User block */}
      <div className="p-3 border-t border-zinc-200">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-7 h-7 rounded-full bg-byred-red/10 border border-byred-red/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-byred-red font-condensed">
              {initials}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-800 truncate">
              {displayName}
            </p>
            <p className="text-[10px] text-zinc-400 truncate capitalize">
              {displayRole}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
