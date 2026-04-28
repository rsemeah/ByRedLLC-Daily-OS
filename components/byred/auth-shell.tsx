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
    <div className={topGap ? "mt-4" : ""}>
      <div className="flex items-center justify-between mb-1.5">
        <label
          htmlFor={id}
          className="block text-xs font-medium text-white/50 uppercase tracking-widest"
        >
          {label}
        </label>
        {rightLabel}
      </div>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        className="h-9 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-[#c8102e]/60 focus:ring-1 focus:ring-[#c8102e]/30"
      />
    </div>
  )
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear()
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(180,0,0,0.18) 0%, transparent 70%), #09090b",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Apr%2020%2C%202026%2C%2012_29_20%20PM-ATivvvRJFjDMpelGYEfLYkYncVvkIr.png"
        alt="By Red, LLC."
        width={180}
        height={72}
        className="object-contain mb-1 select-none"
      />
      <p className="text-[10px] font-semibold tracking-[0.35em] text-white/30 uppercase mb-8">
        Internal operations · execution only
      </p>

      {children}

      <p className="mt-8 text-[11px] text-white/20 text-center">
        By Red, LLC&nbsp;&nbsp;·&nbsp;&nbsp;{year}&nbsp;&nbsp;·&nbsp;&nbsp;Build stable
      </p>
    </div>
  )
}
