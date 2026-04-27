import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md text-sm font-medium',
    'transition-colors duration-(--duration-micro) ease-out',
    'disabled:pointer-events-none disabled:opacity-50',
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
    'shrink-0 outline-none',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--brand-red]',
    'aria-invalid:border-destructive',
  ),
  {
    variants: {
      variant: {
        // Spec variants
        primary:
          'bg-brand-red text-inverse shadow-sm hover:bg-brand-red-hover active:bg-brand-red-hover',
        secondary:
          'bg-surface text-primary border border-border-default hover:bg-canvas hover:border-border-focus active:bg-neutral-subtle',
        ghost:
          'bg-transparent text-primary hover:bg-neutral-subtle active:bg-neutral-subtle/80',
        danger:
          'bg-danger text-inverse shadow-sm hover:bg-danger/90 active:bg-danger/90',

        // Backward-compatible shadcn variants (existing app code uses these)
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        // Spec sizes — sm=32px, md=36px, lg=44px
        sm: 'h-8 px-3 text-[13px] gap-1.5 has-[>svg]:px-2.5',
        md: 'h-9 px-4 has-[>svg]:px-3',
        lg: 'h-11 px-6 text-[15px] has-[>svg]:px-4',

        // Backward-compat shadcn sizes
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-11',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
  }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) {
    const Comp = asChild ? Slot : 'button'
    const isDisabled = disabled || loading

    return (
      <Comp
        ref={ref}
        data-slot="button"
        data-loading={loading || undefined}
        aria-busy={loading || undefined}
        disabled={isDisabled}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            <span className="sr-only">Loading</span>
          </>
        ) : (
          children
        )}
      </Comp>
    )
  },
)

Button.displayName = 'Button'

export { Button, buttonVariants }
export type { ButtonProps }
