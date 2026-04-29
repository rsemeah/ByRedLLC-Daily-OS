"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertOctagon, ArrowRight, Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { z } from "zod"
import { toast } from "sonner"
import { AuthShell, Field } from "@/components/byred/auth-shell"

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  orgName: z.string().max(120).optional(),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [orgName, setOrgName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)
  const [year, setYear] = useState<number | null>(null)

  useEffect(() => { setYear(new Date().getFullYear()) }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const validation = registerSchema.safeParse({
      name: name.trim(),
      orgName: orgName.trim() || undefined,
      email: email.trim(),
      password,
    })
    if (!validation.success) {
      const message = validation.error.issues[0]?.message ?? "Invalid form"
      setError(message)
      toast.error(message)
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const emailRedirectTo = `${window.location.origin}/auth/callback?next=/onboarding`
      const { data, error: authError } = await supabase.auth.signUp({
        email: validation.data.email,
        password: validation.data.password,
        options: {
          emailRedirectTo,
          data: {
            full_name: validation.data.name,
            org_name: validation.data.orgName ?? "",
          },
        },
      })

      if (authError) {
        setError(authError.message)
        toast.error(authError.message)
        setLoading(false)
        return
      }

      if (data.user && !data.session) {
        setCheckEmail(true)
        toast.success("Check your email to confirm your account")
        setLoading(false)
        return
      }

      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign up failed"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      {checkEmail ? (
        <div className="w-full rounded-xl border border-red-900/40 bg-black/60 backdrop-blur-xl px-6 py-6 shadow-[0_0_60px_rgba(200,16,46,0.15)] text-center">
          <div className="mx-auto mb-4 w-10 h-10 rounded-full bg-[#c8102e]/15 flex items-center justify-center">
            <Mail className="w-5 h-5 text-[#c8102e]" strokeWidth={1.75} />
          </div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white">
            Check your email
          </p>
          <p className="mt-2 text-xs leading-relaxed text-white/60">
            We sent a confirmation link. After you confirm, you can sign in.
          </p>
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
                Request access
              </span>
            </div>
            <span className="text-[9px] tracking-[0.12em] uppercase text-white/30">
              Auth &middot; v1
            </span>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2.5">
              <AlertOctagon size={13} strokeWidth={1.9} className="mt-0.5 shrink-0 text-red-400" />
              <p className="text-[11px] leading-snug text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Field id="name" label="Your name" type="text" autoComplete="name" value={name} onChange={setName} />
            <Field id="org" label="Organization" type="text" autoComplete="organization"
              placeholder="e.g. Acme LLC" value={orgName} onChange={setOrgName} required={false} topGap
              rightLabel={<span className="text-[9px] tracking-[0.14em] uppercase text-white/25">Optional</span>}
            />
            <Field id="email" label="Email" type="email" autoComplete="email" placeholder="you@byred.co" value={email} onChange={setEmail} topGap />
            <Field id="password" label="Password" type="password" autoComplete="new-password"
              placeholder="At least 8 characters" value={password} onChange={setPassword} topGap
            />
            <button type="submit" disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#c8102e] py-2.5 text-sm font-bold tracking-[0.3em] uppercase text-white transition hover:bg-[#a30d25] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create account"}
              {!loading && <ArrowRight size={14} strokeWidth={2.25} />}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/40">Have one?</span>
              <Link href="/login" className="text-[10px] font-bold tracking-[0.16em] uppercase text-white underline underline-offset-2 decoration-white/40 hover:decoration-white/80 transition">
                Sign in
              </Link>
            </div>
            <span className="text-[9px] tracking-[0.12em] uppercase text-white/25">
              {year ?? "—"}
            </span>
          </div>
        </div>
      )}
    </AuthShell>
  )
}
