import { cn } from '@/lib/utils'
import { format, isToday, isBefore, parseISO, isValid } from 'date-fns'

interface DueDateCellProps {
  dueDate: string | null
  className?: string
}

export function DueDateCell({ dueDate, className }: DueDateCellProps) {
  if (!dueDate) {
    return <span className={cn('text-xs text-zinc-600', className)}>—</span>
  }

  const date = parseISO(dueDate)
  if (!isValid(date)) {
    return <span className={cn('text-xs text-zinc-600', className)}>—</span>
  }

  const isOverdue = isBefore(date, new Date()) && !isToday(date)
  const isDueToday = isToday(date)

  return (
    <span
      className={cn(
        'text-xs font-medium font-mono',
        isOverdue || isDueToday ? 'text-byred-red' : 'text-zinc-400',
        className
      )}
    >
      {isDueToday ? 'Today' : format(date, 'MMM d')}
    </span>
  )
}
