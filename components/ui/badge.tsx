import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  cn(
    'inline-flex items-center justify-center w-fit shrink-0 whitespace-nowrap',
    'rounded-md font-medium',
    '[&>svg]:pointer-events-none [&>svg]:shrink-0',
    'transition-colors duration-(--duration-micro)',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--brand-red]',
    'aria-invalid:ring-destructive/20',
  ),
  {
    variants: {
      variant: {
        // Filled-subtle: tinted background + colored foreground (no outline)
        success: 'bg-success-subtle text-success',
        warning: 'bg-warning-subtle text-warning',
        danger: 'bg-danger-subtle text-danger',
        info: 'bg-info-subtle text-info',
        neutral: 'bg-neutral-subtle text-neutral-fg',
        brand: 'bg-brand-red-subtle text-brand-red',

        // Backward-compat shadcn variants (existing app code uses these)
        default:
          'border border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'border border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90',
        outline:
          'border border-border-default text-primary [a&]:hover:bg-canvas',
      },
      size: {
        sm: 'px-1.5 py-0 text-[11px] gap-1 [&>svg]:size-3',
        md: 'px-2 py-0.5 text-xs gap-1 [&>svg]:size-3',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'md',
    },
  },
)

type BadgeProps = React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant, size, asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      ref={ref}
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
})

Badge.displayName = 'Badge'

export { Badge, badgeVariants }
export type { BadgeProps }
