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
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { TENANT_COLORS, TENANT_NAMES } from "@/lib/tenant-colors"
import { useUser } from "@/lib/context/user-context"
import { useSidebar } from "@/lib/context/sidebar-context"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const WORK_NAV = [
  { label: "Command Center", href: "/dashboard", icon: LayoutDashboard },
  { label: "Today", href: "/today", icon: CalendarDays },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Leads", href: "/leads", icon: Users },
]

const SYSTEM_NAV = [
  { label: "Activities", href: "/activities", icon: Activity },
  { label: "Tenants", href: "/tenants", icon: Building2 },
  { label: "Settings", href: "/settings", icon: Settings },
]

const TENANTS = [
  { id: "t1", href: "/tasks?tenant_id=t1" },
  { id: "t2", href: "/tasks?tenant_id=t2" },
  { id: "t3", href: "/tasks?tenant_id=t3" },
  { id: "t4", href: "/tasks?tenant_id=t4" },
]

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
  onClick,
}: {
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  active: boolean
  collapsed: boolean
  onClick?: () => void
}) {
  const content = (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-md text-sm transition-colors relative",
        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2",
        active
          ? "text-zinc-900 bg-zinc-100 font-medium"
          : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100",
        active && !collapsed && "border-l-2 border-byred-red -ml-px pl-[11px]"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
      {!collapsed && <span>{label}</span>}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}

function TenantItem({
  id,
  href,
  active,
  collapsed,
  onClick,
}: {
  id: string
  href: string
  active: boolean
  collapsed: boolean
  onClick?: () => void
}) {
  const colors = TENANT_COLORS[id]
  const name = TENANT_NAMES[id]

  const content = (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-md text-sm transition-colors",
        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2",
        active
          ? "text-zinc-900 bg-zinc-100 font-medium"
          : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
      )}
    >
      <span className={cn("w-2 h-2 rounded-full shrink-0", colors.dot)} />
      {!collapsed && <span className="truncate text-xs">{name}</span>}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {name}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}

function SidebarContent({
  collapsed,
  onNavClick,
}: {
  collapsed: boolean
  onNavClick?: () => void
}) {
  const pathname = usePathname()
  const currentUser = useUser()
  const { toggleCollapsed } = useSidebar()
  const isMobile = useIsMobile()

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/"
    return pathname.startsWith(href)
  }

  // Get user display info from profile or auth user
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
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div
          className={cn(
            "border-b border-zinc-200 flex items-center",
            collapsed ? "p-3 justify-center" : "px-4 py-3"
          )}
        >
          <Link href="/dashboard" className="flex flex-col items-center" onClick={onNavClick}>
            {collapsed ? (
              <span className="font-condensed font-bold text-byred-red text-sm tracking-widest">
                BR
              </span>
            ) : (
              <>
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Apr%2028%2C%202026%2C%2009_32_39%20AM-x3FJDIpEVCK0sy9RmbGiMlhyKPNdec.png"
                  alt="By Red, LLC."
                  width={120}
                  height={50}
                  className="object-contain"
                  priority
                />
                <span className="text-[10px] font-semibold tracking-[0.25em] text-zinc-400 uppercase -mt-1">
                  Daily OS
                </span>
              </>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav
          className={cn(
            "flex-1 overflow-y-auto py-4 space-y-6",
            collapsed ? "px-2" : "px-3"
          )}
        >
          {/* Work */}
          <div>
            {!collapsed && (
              <p className="text-[10px] font-semibold tracking-widest text-zinc-400 uppercase px-3 mb-2">
                Work
              </p>
            )}
            <div className="space-y-0.5">
              {WORK_NAV.map((item) => (
                <NavItem
                  key={item.href}
                  {...item}
                  active={isActive(item.href)}
                  collapsed={collapsed}
                  onClick={onNavClick}
                />
              ))}
            </div>
          </div>

          {/* Tenants */}
          <div>
            {!collapsed && (
              <p className="text-[10px] font-semibold tracking-widest text-zinc-400 uppercase px-3 mb-2">
                Tenants
              </p>
            )}
            <div className="space-y-0.5">
              {TENANTS.map(({ id, href }) => {
                const active = pathname.includes(`tenant_id=${id}`)
                return (
                  <TenantItem
                    key={id}
                    id={id}
                    href={href}
                    active={active}
                    collapsed={collapsed}
                    onClick={onNavClick}
                  />
                )
              })}
            </div>
          </div>

          {/* System */}
          <div>
            {!collapsed && (
              <p className="text-[10px] font-semibold tracking-widest text-zinc-400 uppercase px-3 mb-2">
                System
              </p>
            )}
            <div className="space-y-0.5">
              {SYSTEM_NAV.map((item) => (
                <NavItem
                  key={item.href}
                  {...item}
                  active={isActive(item.href)}
                  collapsed={collapsed}
                  onClick={onNavClick}
                />
              ))}
            </div>
          </div>
        </nav>

        {/* Collapse toggle (desktop only) */}
        {!isMobile && (
          <div className="px-3 py-2 border-t border-zinc-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapsed}
              className={cn(
                "w-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100",
                collapsed ? "px-2" : "justify-start"
              )}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 mr-2" strokeWidth={1.75} />
                  <span className="text-xs">Collapse</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* User block */}
        <div
          className={cn(
            "border-t border-zinc-200",
            collapsed ? "p-2" : "p-3"
          )}
        >
          <div
            className={cn(
              "flex items-center px-2 py-2",
              collapsed ? "justify-center" : "gap-2.5"
            )}
          >
            <div className="w-7 h-7 rounded-full bg-byred-red/10 border border-byred-red/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-byred-red font-condensed">
                {initials}
              </span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-800 truncate">
                  {displayName}
                </p>
                <p className="text-[10px] text-zinc-400 truncate capitalize">
                  {displayRole}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export function AppSidebar() {
  const { isCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar()
  const isMobile = useIsMobile()

  // Mobile: use Sheet
  if (isMobile) {
    return (
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent
          side="left"
          className="w-64 p-0 bg-white border-r border-zinc-200"
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SidebarContent
            collapsed={false}
            onNavClick={() => setIsMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop: fixed sidebar
  return (
    <aside
      className={cn(
        "shrink-0 flex flex-col h-screen bg-white border-r border-zinc-200 fixed left-0 top-0 z-40 transition-all duration-300",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      <SidebarContent collapsed={isCollapsed} />
    </aside>
  )
}
