import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: LucideIcon
  headline: string
  subcopy?: string
  actionLabel?: string
  onAction?: () => void
  actionHref?: string
  className?: string
}

export function EmptyState({
  icon: Icon,
  headline,
  subcopy,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <Icon className="w-8 h-8 text-zinc-600 mb-3" strokeWidth={1.75} />
      <p className="text-sm font-medium text-zinc-400">{headline}</p>
      {subcopy && <p className="text-xs text-zinc-600 mt-1 max-w-xs">{subcopy}</p>}
      {actionLabel && onAction && (
        <Button
          size="sm"
          className="mt-4 bg-byred-red hover:bg-byred-red-hot text-white"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
