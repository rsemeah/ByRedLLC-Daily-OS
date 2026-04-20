import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  count: number
  icon: LucideIcon
  iconColor: string
  href?: string
  className?: string
}

export function MetricCard({ label, count, icon: Icon, iconColor, href, className }: MetricCardProps) {
  const content = (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-md bg-zinc-900 border border-zinc-800 transition-colors',
        href && 'hover:border-zinc-700 hover:bg-zinc-800/80 cursor-pointer',
        className
      )}
    >
      <div className={cn('p-2 rounded-md bg-zinc-800', iconColor)}>
        <Icon className="w-5 h-5" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-2xl font-condensed font-bold text-zinc-100 leading-none">{count}</p>
        <p className="text-xs text-zinc-500 mt-1">{label}</p>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}
