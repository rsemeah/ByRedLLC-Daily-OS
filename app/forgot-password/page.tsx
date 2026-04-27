"use client"

import Link from "next/link"
import { useState } from "react"
import { AlertOctagon, ArrowRight, Mail } from "lucide-react"
import { z } from "zod"
import { toast } from "sonner"
import { AuthShell, Field } from "@/components/byred/auth-shell"

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
})

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setWarning(null)
    setLoading(true)

    const validation = emailSchema.safeParse({ email })
    if (!validation.success) {
      const message = validation.error.issues[0]?.message ?? "Invalid email"
      setError(message)
      toast.error(message)
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: validation.data.email }),
      })

      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string; warning?: string }
        | null

      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After")
        const msg =
          body?.error ??
          `Too many reset attempts. Try again in ${retryAfter ?? "a few"} seconds.`
        setError(msg)
        toast.error(msg)
        return
      }

      if (!res.ok) {
        const msg = body?.error ?? "Could not send reset email."
        setError(msg)
        toast.error(msg)
        return
      }

      if (body?.warning) setWarning(body.warning)
      setSent(true)
      toast.success("Check your email for the reset link")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error — try again."
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      {sent ? (
        <div className="w-full rounded-xl border border-red-900/40 bg-black/60 backdrop-blur-xl px-6 py-6 shadow-[0_0_60px_rgba(200,16,46,0.15)] text-center">
          <div className="mx-auto mb-4 w-10 h-10 rounded-full bg-[#c8102e]/15 flex items-center justify-center">
            <Mail className="w-5 h-5 text-[#c8102e]" strokeWidth={1.75} />
          </div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white">
            Check your email
          </p>
          <p className="mt-2 text-xs leading-relaxed text-white/60">
            If an account exists for{" "}
            <span className="font-medium text-white/85">{email.trim().toLowerCase()}</span>, we sent
            a reset link. It expires in 60 minutes.
          </p>
          {warning && (
            <div className="mt-3 text-left text-[11px] rounded-md border border-amber-700/40 bg-amber-950/40 text-amber-300 px-3 py-2">
              {warning}
            </div>
          )}
          <Link
            href="/login"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 py-2.5 text-[11px] font-bold tracking-[0.25em] uppercase text-white transition hover:bg-white/10"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <div className="w-full rounded-xl border border-red-900/40 bg-black/60 backdrop-blur-xl px-6 py-5 shadow-[0_0_60px_rgba(200,16,46,0.15)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="block h-1.5 w-1.5 rounded-[1px] bg-[#c8102e]" />
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white">
                Reset password
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

          <p className="mb-3 text-[11px] leading-relaxed text-white/50">
            Enter your email and we&apos;ll send a link to reset your password.
          </p>

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

            <button
              type="submit"
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#c8102e] py-2.5 text-sm font-bold tracking-[0.3em] uppercase text-white transition hover:bg-[#a30d25] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send reset link"}
              {!loading && <ArrowRight size={14} strokeWidth={2.25} />}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
            <Link
              href="/login"
              className="text-[10px] font-bold tracking-[0.16em] uppercase text-white/60 hover:text-white transition"
            >
              &larr; Back to sign in
            </Link>
            <span className="text-[9px] tracking-[0.12em] uppercase text-white/25">
              60 min expiry
            </span>
          </div>
        </div>
      )}
    </AuthShell>
  )
}
