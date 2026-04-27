import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  not_started:  { label: 'Not Started', classes: 'bg-zinc-100 text-zinc-500' },
  in_progress:  { label: 'In Progress', classes: 'bg-sky-50 text-sky-600 border border-sky-200' },
  overdue:      { label: 'Overdue',     classes: 'bg-byred-red/10 text-byred-red border border-byred-red/20' },
  done:         { label: 'Done',        classes: 'bg-emerald-50 text-emerald-600 border border-emerald-200' },
  blocked:      { label: 'Blocked',     classes: 'bg-amber-50 text-amber-600 border border-amber-200' },
  cancelled:    { label: 'Cancelled',   classes: 'bg-zinc-100 text-zinc-400 line-through' },
}

interface StatusBadgeProps {
  status: string | null
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = status?.toLowerCase() ?? 'not_started'
  const config = STATUS_CONFIG[key] ?? { label: status ?? '—', classes: 'bg-zinc-100 text-zinc-500' }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium',
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  )
}
