import * as React from 'react'

import { cn } from '@/lib/utils'

type SkeletonVariant = 'text' | 'circle' | 'card' | 'table-row'

type SkeletonProps = React.ComponentProps<'div'> & {
  variant?: SkeletonVariant
  /** Number of rows to render for `text` and `table-row` variants. */
  rows?: number
}

const VARIANT_CLASSNAME: Record<SkeletonVariant, string> = {
  text: 'h-3.5 w-full rounded-sm',
  circle: 'size-9 rounded-full',
  card: 'h-32 w-full rounded-lg',
  'table-row': 'h-10 w-full rounded-sm',
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  function Skeleton(
    { className, variant = 'text', rows = 1, ...props },
    ref,
  ) {
    if ((variant === 'text' || variant === 'table-row') && rows > 1) {
      return (
        <div
          ref={ref}
          data-slot="skeleton-group"
          className="flex flex-col gap-2"
          aria-busy="true"
          aria-live="polite"
        >
          {Array.from({ length: rows }, (_, i) => (
            <div
              key={i}
              data-slot="skeleton"
              className={cn(
                'animate-shimmer',
                VARIANT_CLASSNAME[variant],
                // Last text row reads more naturally if it's narrower
                variant === 'text' && i === rows - 1 && 'w-4/5',
                className,
              )}
              {...(i === 0 ? props : {})}
            />
          ))}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        data-slot="skeleton"
        aria-busy="true"
        aria-live="polite"
        className={cn(
          'animate-shimmer',
          VARIANT_CLASSNAME[variant],
          className,
        )}
        {...props}
      />
    )
  },
)

Skeleton.displayName = 'Skeleton'

export { Skeleton }
export type { SkeletonProps, SkeletonVariant }
