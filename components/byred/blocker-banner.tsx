'use client'

import { AlertOctagon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BlockerBannerProps {
  reason: string | null
  onUnblock?: () => void
}

export function BlockerBanner({ reason, onUnblock }: BlockerBannerProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-md bg-byred-red/10 border border-byred-red/30">
      <AlertOctagon className="w-4 h-4 text-byred-red shrink-0 mt-0.5" strokeWidth={1.75} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-byred-red">Blocked</p>
        {reason && (
          <p className="text-xs text-zinc-400 mt-0.5">{reason}</p>
        )}
      </div>
      {onUnblock && (
        <Button
          variant="outline"
          size="sm"
          onClick={onUnblock}
          className="shrink-0 h-7 text-xs border-byred-red/40 text-byred-red hover:bg-byred-red/10"
        >
          Unblock
        </Button>
      )}
    </div>
  )
}
