"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertOctagon, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { z } from "zod"
import { toast } from "sonner"

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const validation = loginSchema.safeParse({ email, password })
    if (!validation.success) {
      const message =
        validation.error.issues[0]?.message ?? "Invalid login payload"
      setError(message)
      toast.error(message)
      setLoading(false)
      return
    }

    let supabase
    try {
      supabase = createClient()
    } catch (initException) {
      const detail =
        initException instanceof Error
          ? initException.message
          : String(initException)
      console.error("Supabase client init failed on /login", detail)
      const friendly =
        "Sign-in is temporarily unavailable — the app is misconfigured. Ask the admin to check NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY on this environment."
      setError(friendly)
      toast.error(friendly)
      setLoading(false)
      return
    }

    try {
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: validation.data.email,
          password: validation.data.password,
        }),
      })

      if (!loginRes.ok) {
        const errBody = (await loginRes.json().catch(() => ({}))) as {
          error?: string
        }
        const message = errBody.error ?? "Sign-in failed."
        setError(message)
        toast.error(message)
        setLoading(false)
        return
      }

      await supabase.auth.refreshSession().catch(() => {})
      router.push("/dashboard")
      router.refresh()
    } catch (authException) {
      const message =
        authException instanceof Error
          ? authException.message
          : "Sign-in failed unexpectedly"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full rounded-xl border border-red-900/40 bg-black/60 backdrop-blur-xl px-6 py-5 shadow-[0_0_60px_rgba(200,16,46,0.15)]">
      {/* Card header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="block h-1.5 w-1.5 rounded-[1px] bg-[#c8102e]" />
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white">
            Sign in
          </span>
        </div>
        <span className="text-[9px] tracking-[0.12em] uppercase text-white/30">
          Auth &middot; v1
        </span>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2.5">
          <AlertOctagon
            size={13}
            strokeWidth={1.9}
            className="mt-0.5 shrink-0 text-red-400"
          />
          <p className="text-[11px] leading-snug text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@byred.co"
          value={email}
          onChange={setEmail}
        />

        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
          topGap
          rightLabel={
            <Link
              href="/forgot-password"
              className="text-[9px] font-semibold tracking-[0.14em] uppercase text-white/40 hover:text-white/70 transition-colors"
            >
              Forgot?
            </Link>
          }
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#c8102e] py-2.5 text-sm font-bold tracking-[0.3em] uppercase text-white transition hover:bg-[#a30d25] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in\u2026" : "Sign in"}
          {!loading && <ArrowRight size={14} strokeWidth={2.25} />}
        </button>
      </form>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40">No account?</span>
          <Link
            href="/register"
            className="text-[10px] font-bold tracking-[0.16em] uppercase text-white underline underline-offset-2 decoration-white/40 hover:decoration-white/80 transition"
          >
            Request access
          </Link>
        </div>
        <span className="text-[9px] tracking-[0.12em] uppercase text-white/25">
          Allowlist gated
        </span>
      </div>
    </div>
  )
}

type FieldProps = {
  id: string
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  placeholder?: string
  topGap?: boolean
  rightLabel?: React.ReactNode
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  placeholder,
  topGap,
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
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-[#c8102e]/60 focus:ring-1 focus:ring-[#c8102e]/30"
      />
    </div>
  )
}
