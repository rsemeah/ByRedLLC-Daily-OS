type FieldProps = {
  id: string
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  placeholder?: string
  topGap?: boolean
  required?: boolean
  rightLabel?: React.ReactNode
}

export function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  placeholder,
  topGap,
  required = true,
  rightLabel,
}: FieldProps) {
  return (
    <div className={topGap ? "mt-3" : ""}>
      <div className="mb-1.5 flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-[9px] font-bold tracking-[0.2em] uppercase text-white/50"
        >
          {label}
        </label>
        {rightLabel}
      </div>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-[#c8102e]/60 focus:ring-1 focus:ring-[#c8102e]/30"
      />
    </div>
  )
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear()
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero/byred-hero.webp"
        alt=""
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/20 to-black/80 pointer-events-none"
      />
      <div className="relative z-10 flex min-h-screen items-end justify-center pb-10 px-4">
        <div className="w-full max-w-sm">
          <p className="mb-3 text-center text-[10px] tracking-[0.4em] uppercase text-white/60">
            Internal operations &middot; execution only
          </p>
          {children}
          <div className="mt-3 flex items-center justify-between text-[9px] tracking-[0.14em] uppercase text-white/40">
            <span>By Red, LLC</span>
            <span>{year} &middot; Build stable</span>
          </div>
        </div>
      </div>
    </main>
  )
}
