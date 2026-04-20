'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Bell, ChevronRight, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { SEED_DAILY_BRIEF } from '@/lib/seed'
import { AlertTriangle } from 'lucide-react'

const ROUTE_LABELS: Record<string, string> = {
  '/':           'Command Center',
  '/today':      'Today',
  '/tasks':      'Tasks',
  '/leads':      'Leads',
  '/activities': 'Activities',
  '/tenants':    'Tenants',
  '/settings':   'Settings',
}

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return [{ label: 'Command Center', href: '/' }]

  const crumbs: { label: string; href: string }[] = []
  let path = ''
  for (const seg of segments) {
    path += `/${seg}`
    const label = ROUTE_LABELS[path] ?? (seg.length > 12 ? `${seg.slice(0, 10)}…` : seg)
    crumbs.push({ label, href: path })
  }
  return crumbs
}

export function AppTopbar() {
  const pathname = usePathname()
  const [briefOpen, setBriefOpen] = useState(false)
  const breadcrumbs = getBreadcrumbs(pathname)
  const brief = SEED_DAILY_BRIEF

  return (
    <header className="fixed top-0 left-60 right-0 h-14 z-30 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3 h-3 text-zinc-600" strokeWidth={1.75} />}
            {i === breadcrumbs.length - 1 ? (
              <span className="text-zinc-200 font-medium">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Daily Brief */}
        <Popover open={briefOpen} onOpenChange={setBriefOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 gap-2 text-xs"
            >
              <FileText className="w-4 h-4" strokeWidth={1.75} />
              Brief
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 bg-zinc-900 border-zinc-800 p-0"
            align="end"
          >
            <div className="p-4 border-b border-zinc-800">
              <p className="text-xs text-zinc-500 mb-1">Daily Brief · Apr 20</p>
              <p className="text-sm font-medium text-zinc-100 leading-snug">
                {brief.summary.headline}
              </p>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Top 3</p>
                <ol className="space-y-1">
                  {brief.summary.top_3.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                      <span className="text-byred-red font-mono font-medium shrink-0">{i + 1}.</span>
                      {item}
                    </li>
                  ))}
                </ol>
              </div>
              {brief.summary.warnings.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Warnings</p>
                  {brief.summary.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-amber-400">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" strokeWidth={1.75} />
                      {w}
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-2 border-t border-zinc-800">
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Next Action</p>
                <p className="text-sm font-medium text-zinc-100">{brief.summary.next_action}</p>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 w-8 h-8"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" strokeWidth={1.75} />
        </Button>

        {/* Avatar */}
        <div
          className="w-7 h-7 rounded-full bg-byred-red/20 border border-byred-red/30 flex items-center justify-center cursor-pointer"
          aria-label="User menu"
        >
          <span className="text-xs font-semibold text-byred-red font-condensed">RO</span>
        </div>
      </div>
    </header>
  )
}
