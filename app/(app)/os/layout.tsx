"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FolderKanban,
  Trello,
  ListTodo,
  Calendar,
  Users,
  Upload,
  FileText,
  BarChart2,
  Settings,
  MessageSquare,
  Zap,
  Bot,
  Database,
  Radio,
} from "lucide-react"

const OS_NAV_GROUPS = [
  {
    label: "Work",
    items: [
      { label: "Dashboard",  href: "/os/dashboard",  icon: LayoutDashboard },
      { label: "Projects",   href: "/os/projects",   icon: FolderKanban },
      { label: "Boards",     href: "/os/boards",     icon: Trello },
      { label: "Tasks",      href: "/os/tasks",      icon: ListTodo },
      { label: "Calendar",   href: "/os/calendar",   icon: Calendar },
    ],
  },
  {
    label: "Team",
    items: [
      { label: "Team",       href: "/os/team",       icon: Users },
      { label: "Comms",      href: "/os/comms",      icon: MessageSquare, placeholder: true },
    ],
  },
  {
    label: "Ops",
    items: [
      { label: "Import",     href: "/os/import/monday", icon: Upload },
      { label: "Docs",       href: "/os/docs",       icon: FileText, placeholder: true },
      { label: "CRM",        href: "/os/crm",        icon: Database, placeholder: true },
      { label: "Files",      href: "/os/files",      icon: Database, placeholder: true },
      { label: "Reports",    href: "/os/reports",    icon: BarChart2, placeholder: true },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "AI",         href: "/os/ai",         icon: Bot, placeholder: true },
      { label: "Automations",href: "/os/automations",icon: Zap, placeholder: true },
      { label: "Signals",    href: "/os/reports",    icon: Radio, placeholder: true },
    ],
  },
  {
    label: "Config",
    items: [
      { label: "Settings",   href: "/os/settings",   icon: Settings, placeholder: true },
    ],
  },
]

function OSSidebarItem({
  href,
  label,
  icon: Icon,
  active,
  placeholder,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  active: boolean
  placeholder?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-colors group",
        active
          ? "bg-white/8 text-white font-medium"
          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5",
        placeholder && !active && "opacity-50 pointer-events-none"
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
      <span>{label}</span>
      {placeholder && (
        <span className="ml-auto text-[9px] text-zinc-700 font-medium tracking-widest uppercase">
          Soon
        </span>
      )}
    </Link>
  )
}

export default function OSLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full -mx-4 md:-mx-8 -my-6">
      {/* OS sub-sidebar */}
      <aside className="w-52 shrink-0 bg-zinc-950 border-r border-zinc-800/60 flex flex-col overflow-y-auto hidden lg:flex">
        {/* Header */}
        <div className="px-4 py-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#D7261E] flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">OS</span>
            </div>
            <span className="text-xs font-semibold text-white tracking-wide">By Red OS</span>
          </div>
          <p className="text-[10px] text-zinc-600 mt-0.5">Internal Operations</p>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 px-2 py-3 space-y-4">
          {OS_NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[9px] font-semibold tracking-widest text-zinc-700 uppercase px-3 mb-1">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <OSSidebarItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={pathname === item.href || (item.href !== "/os/dashboard" && pathname.startsWith(item.href))}
                    placeholder={item.placeholder}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 bg-zinc-950 overflow-y-auto">
        <div className="px-6 py-6">
          {children}
        </div>
      </div>
    </div>
  )
}
