"use client"

import { AuthShell, Field } from "@/components/byred/auth-shell"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error("Passwords do not match.")
      return
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.")
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        toast.error(error.message)
      } else {
        setDone(true)
        toast.success("Password updated.")
        setTimeout(() => router.push("/dashboard"), 2000)
      }
    } catch {
      toast.error("Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-white/8 bg-white/4 backdrop-blur-sm overflow-hidden">
          <div className="px-6 pt-5 pb-2 border-b border-white/6 flex items-center justify-between">
            <span className="text-xs font-semibold tracking-widest text-white/40 uppercase">
              New password
            </span>
            <span className="text-[10px] font-mono text-white/20">Auth · v1</span>
          </div>

          {done ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-white/60 leading-relaxed">
                Password updated. Redirecting to dashboard…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-1">
              <Field
                id="password"
                label="New password"
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
              />
              <Field
                id="confirm"
                label="Confirm password"
                type="password"
                value={confirm}
                onChange={setConfirm}
                autoComplete="new-password"
                placeholder="Repeat password"
                topGap
              />
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 flex items-center justify-center gap-2 rounded-md bg-[#c8102e] hover:bg-[#a00d25] text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {loading ? "Saving…" : "Set new password"}
                  {!loading && <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />}
                </button>
              </div>
            </form>
          )}

          <div className="px-6 pb-5">
            <Link
              href="/login"
              className="w-full h-9 flex items-center justify-center gap-2 rounded-md border border-white/10 text-white/50 text-sm hover:text-white/80 hover:border-white/20 transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </AuthShell>
  )
}
