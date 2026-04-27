import * as React from 'react'

import { cn } from '@/lib/utils'

type InputProps = Omit<React.ComponentProps<'input'>, 'size'> & {
  /** Icon rendered inside the left edge of the input. */
  startIcon?: React.ReactNode
  /** Inline error message rendered under the input. Sets aria-invalid + red border. */
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = 'text', startIcon, error, id, ...props },
  ref,
) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  const errorId = error ? `${inputId}-error` : undefined
  const hasError = Boolean(error)

  const inputElement = (
    <input
      ref={ref}
      id={inputId}
      type={type}
      data-slot="input"
      aria-invalid={hasError || undefined}
      aria-describedby={errorId}
      className={cn(
        'h-9 w-full min-w-0 rounded-md border bg-surface px-3 py-1 text-sm',
        'text-primary placeholder:text-tertiary',
        'shadow-xs transition-colors duration-(--duration-micro) outline-none',
        'border-border-default',
        'focus-visible:border-border-focus focus-visible:ring-2 focus-visible:ring-brand-red-muted',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-canvas',
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-primary',
        'selection:bg-brand-red-subtle selection:text-primary',
        startIcon && 'pl-9',
        hasError &&
          'border-danger focus-visible:border-danger focus-visible:ring-danger/20',
        className,
      )}
      {...props}
    />
  )

  if (!startIcon && !error) {
    return inputElement
  }

  return (
    <div className="w-full">
      {startIcon ? (
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tertiary [&>svg]:size-4"
          >
            {startIcon}
          </span>
          {inputElement}
        </div>
      ) : (
        inputElement
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-[12px] leading-tight text-danger"
        >
          {error}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'

export { Input }
export type { InputProps }
