"use client"

import { AuthShell, Field } from "@/components/byred/auth-shell"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })
      if (error) {
        toast.error(error.message)
      } else {
        setSent(true)
        toast.success("Reset link sent — check your email.")
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
              Reset password
            </span>
            <span className="text-[10px] font-mono text-white/20">Auth · v1</span>
          </div>

          {sent ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-white/60 leading-relaxed">
                Check your email for a reset link.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-1">
              <Field
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                placeholder="you@byred.co"
              />
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-9 flex items-center justify-center gap-2 rounded-md bg-[#c8102e] hover:bg-[#a00d25] text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {loading ? "Sending…" : "Send reset link"}
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
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </AuthShell>
  )
}
