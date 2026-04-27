'use client'

import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full',
  {
    variants: {
      size: {
        xs: 'size-5 text-[9px]',
        sm: 'size-7 text-[11px]',
        md: 'size-9 text-[13px]',
        lg: 'size-12 text-[15px]',
      },
      ring: {
        none: '',
        brand:
          'ring-2 ring-brand-red ring-offset-2 ring-offset-surface',
      },
    },
    defaultVariants: {
      size: 'md',
      ring: 'none',
    },
  },
)

type AvatarRootProps = React.ComponentProps<typeof AvatarPrimitive.Root> &
  VariantProps<typeof avatarVariants>

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarRootProps
>(function Avatar({ className, size, ring, ...props }, ref) {
  return (
    <AvatarPrimitive.Root
      ref={ref}
      data-slot="avatar"
      className={cn(avatarVariants({ size, ring }), className)}
      {...props}
    />
  )
})
Avatar.displayName = 'Avatar'

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentProps<typeof AvatarPrimitive.Image>
>(function AvatarImage({ className, ...props }, ref) {
  return (
    <AvatarPrimitive.Image
      ref={ref}
      data-slot="avatar-image"
      className={cn('aspect-square size-full object-cover', className)}
      {...props}
    />
  )
})
AvatarImage.displayName = 'AvatarImage'

// Deterministic, accessible initials swatches. We hash the seed (name/email)
// into one of six brand-aligned tints so the same person always gets the
// same color across the app — important for at-a-glance recognition.
const FALLBACK_PALETTE = [
  'bg-brand-red-subtle text-brand-red',
  'bg-info-subtle text-info',
  'bg-success-subtle text-success',
  'bg-warning-subtle text-warning',
  'bg-neutral-subtle text-neutral-fg',
  'bg-[#F3F0FF] text-[#6D28D9]',
] as const

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

type AvatarFallbackProps = React.ComponentProps<
  typeof AvatarPrimitive.Fallback
> & {
  /** Source string used to compute initials and a deterministic tint. */
  name?: string
}

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  AvatarFallbackProps
>(function AvatarFallback({ className, name, children, ...props }, ref) {
  const seed = name ?? (typeof children === 'string' ? children : '')
  const swatch = seed
    ? FALLBACK_PALETTE[hashString(seed) % FALLBACK_PALETTE.length]
    : 'bg-neutral-subtle text-neutral-fg'

  const content = name ? computeInitials(name) : children

  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      data-slot="avatar-fallback"
      className={cn(
        'flex size-full items-center justify-center rounded-full font-semibold uppercase tracking-wide',
        swatch,
        className,
      )}
      {...props}
    >
      {content}
    </AvatarPrimitive.Fallback>
  )
})
AvatarFallback.displayName = 'AvatarFallback'

export { Avatar, AvatarImage, AvatarFallback, avatarVariants }
export type { AvatarRootProps, AvatarFallbackProps }
