'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  Users,
  Activity,
  Building2,
  Settings,
} from 'lucide-react'
import { TENANT_COLORS, TENANT_NAMES } from '@/lib/tenant-colors'
import { SEED_USER } from '@/lib/seed'

const WORK_NAV = [
  { label: 'Command Center', href: '/',          icon: LayoutDashboard },
  { label: 'Today',          href: '/today',     icon: CalendarDays },
  { label: 'Tasks',          href: '/tasks',     icon: CheckSquare },
  { label: 'Leads',          href: '/leads',     icon: Users },
]

const SYSTEM_NAV = [
  { label: 'Activities', href: '/activities', icon: Activity },
  { label: 'Tenants',    href: '/tenants',    icon: Building2 },
  { label: 'Settings',   href: '/settings',   icon: Settings },
]

const TENANTS = [
  { id: 't1', href: '/tasks?tenant_id=t1' },
  { id: 't2', href: '/tasks?tenant_id=t2' },
  { id: 't3', href: '/tasks?tenant_id=t3' },
  { id: 't4', href: '/tasks?tenant_id=t4' },
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
        'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors relative',
        active
          ? 'text-zinc-900 bg-zinc-100 border-l-2 border-byred-red -ml-px pl-[11px] font-medium'
          : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
      <span>{label}</span>
    </Link>
  )
}

export function AppSidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const user = SEED_USER
  const initials = user.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'RO'

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
          <div className="space-y-0.5">
            {TENANTS.map(({ id, href }) => {
              const colors = TENANT_COLORS[id]
              const name = TENANT_NAMES[id]
              const active = pathname.includes(`tenant_id=${id}`)
              return (
                <Link
                  key={id}
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                    active
                      ? 'text-zinc-900 bg-zinc-100 font-medium'
                      : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full shrink-0', colors.dot)} />
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
            <span className="text-xs font-semibold text-byred-red font-condensed">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-zinc-800 truncate">{user.full_name}</p>
            <p className="text-[10px] text-zinc-400 truncate">{user.role}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
