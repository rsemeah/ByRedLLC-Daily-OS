import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  not_started:  { label: 'Not Started', classes: 'bg-zinc-800 text-zinc-400' },
  in_progress:  { label: 'In Progress', classes: 'bg-sky-500/10 text-sky-400' },
  overdue:      { label: 'Overdue',     classes: 'bg-byred-red/10 text-byred-red' },
  done:         { label: 'Done',        classes: 'bg-emerald-500/10 text-emerald-400' },
  blocked:      { label: 'Blocked',     classes: 'bg-amber-500/10 text-amber-400' },
  cancelled:    { label: 'Cancelled',   classes: 'bg-zinc-800 text-zinc-500 line-through' },
}

interface StatusBadgeProps {
  status: string | null
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = status?.toLowerCase() ?? 'not_started'
  const config = STATUS_CONFIG[key] ?? { label: status ?? '—', classes: 'bg-zinc-800 text-zinc-400' }

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
