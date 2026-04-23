"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Activity,
  Building2,
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  LayoutGrid,
  Plus,
  Settings,
  UserPlus,
  Users,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"

type NavCmd = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}

const WORK: NavCmd[] = [
  { label: "Command Center", href: "/", icon: LayoutDashboard },
  { label: "Today", href: "/today", icon: CalendarDays },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Leads", href: "/leads", icon: Users },
]

const SYSTEM: NavCmd[] = [
  { label: "Activities", href: "/activities", icon: Activity },
  { label: "Tenants", href: "/tenants", icon: Building2 },
  { label: "Monday.com", href: "/integrations/monday", icon: LayoutGrid },
  { label: "Settings", href: "/settings", icon: Settings },
]

const ACTIONS: NavCmd[] = [
  { label: "New task", href: "/tasks/new", icon: Plus },
  { label: "New lead", href: "/leads/new", icon: UserPlus },
]

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const onOpenChange = useCallback((next: boolean) => {
    setOpen(next)
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  function renderItems(items: NavCmd[]) {
    return items.map(({ label, href, icon: Icon }) => (
      <CommandItem
        key={href + label}
        value={`${label} ${href}`}
        onSelect={() => go(href)}
        className="cursor-pointer"
      >
        <Icon className="size-4 shrink-0 opacity-70" strokeWidth={1.75} />
        <span>{label}</span>
      </CommandItem>
    ))
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Jump to a page or create a record"
    >
      <CommandInput
        placeholder="Search pages…"
        className="placeholder:text-zinc-400 text-zinc-900"
      />
      <CommandList className="max-h-[min(420px,50vh)]">
        <CommandEmpty className="text-zinc-500 text-sm py-8">
          No matches.
        </CommandEmpty>
        <CommandGroup
          heading="Work"
          className="[&_[cmdk-group-heading]]:text-zinc-400"
        >
          {renderItems(WORK)}
        </CommandGroup>
        <CommandSeparator className="bg-zinc-200" />
        <CommandGroup
          heading="System"
          className="[&_[cmdk-group-heading]]:text-zinc-400"
        >
          {renderItems(SYSTEM)}
        </CommandGroup>
        <CommandSeparator className="bg-zinc-200" />
        <CommandGroup
          heading="Actions"
          className="[&_[cmdk-group-heading]]:text-zinc-400"
        >
          {renderItems(ACTIONS)}
        </CommandGroup>
      </CommandList>
      <div className="border-t border-zinc-100 px-3 py-2 text-[10px] text-zinc-400 flex justify-between items-center bg-zinc-50/80">
        <span>byred_os</span>
        <kbd className="pointer-events-none rounded border border-zinc-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-500">
          ⌘K
        </kbd>
      </div>
    </CommandDialog>
  )
}
