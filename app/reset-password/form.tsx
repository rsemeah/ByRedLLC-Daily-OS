"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertOctagon, ArrowRight, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { z } from "zod"
import { toast } from "sonner"
import { AuthShell, Field } from "@/components/byred/auth-shell"

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  })

export function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const validation = passwordSchema.safeParse({ password, confirm })
    if (!validation.success) {
      const message = validation.error.issues[0]?.message ?? "Invalid password"
      setError(message)
      toast.error(message)
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password: validation.data.password,
      })

      if (updateError) {
        const expired = /session|jwt|grant|token/i.test(updateError.message)
        if (expired) {
          toast.error("Reset link expired. Request a new one.")
          router.push("/forgot-password?expired=1")
          return
        }
        setError(updateError.message)
        toast.error(updateError.message)
        setLoading(false)
        return
      }

      setDone(true)
      toast.success("Password updated successfully")
      setTimeout(() => {
        router.push("/dashboard")
        router.refresh()
      }, 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      {done ? (
        <div className="w-full rounded-xl border border-emerald-900/40 bg-black/60 backdrop-blur-xl px-6 py-6 shadow-[0_0_60px_rgba(16,185,129,0.15)] text-center">
          <div className="mx-auto mb-4 w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" strokeWidth={1.75} />
          </div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white">
            Password updated
          </p>
          <p className="mt-2 text-xs leading-relaxed text-white/60">
            Redirecting you to the dashboard&hellip;
          </p>
        </div>
      ) : (
        <div className="w-full rounded-xl border border-red-900/40 bg-black/60 backdrop-blur-xl px-6 py-5 shadow-[0_0_60px_rgba(200,16,46,0.15)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="block h-1.5 w-1.5 rounded-[1px] bg-[#c8102e]" />
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white">
                New password
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
              id="password"
              label="New password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={setPassword}
            />
            <Field
              id="confirm"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={setConfirm}
              topGap
            />

            <button
              type="submit"
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#c8102e] py-2.5 text-sm font-bold tracking-[0.3em] uppercase text-white transition hover:bg-[#a30d25] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Updating…" : "Update password"}
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
              Encrypted
            </span>
          </div>
        </div>
      )}
    </AuthShell>
  )
}
