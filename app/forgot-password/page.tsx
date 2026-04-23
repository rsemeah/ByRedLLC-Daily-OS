"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AlertOctagon, ArrowLeft, Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { z } from "zod"
import { toast } from "sonner"

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
})

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
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
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        validation.data.email,
        { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` }
      )

      if (resetError) {
        setError(resetError.message)
        toast.error(resetError.message)
        setLoading(false)
        return
      }

      setSent(true)
      toast.success("Check your email for the reset link")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const year = new Date().getFullYear()

  if (sent) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-byred-red/10 flex items-center justify-center">
            <Mail className="w-6 h-6 text-byred-red" strokeWidth={1.75} />
          </div>
          <h1 className="text-lg font-medium text-zinc-900">Check your email</h1>
          <p className="text-sm text-zinc-600">
            If an account exists for <span className="font-medium text-zinc-800">{email.trim().toLowerCase()}</span>,
            we sent a password reset link. It expires in 1 hour.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
        <p className="mt-8 text-center text-xs text-zinc-400">By Red, LLC &middot; {year}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center">
          <div className="rounded-2xl bg-zinc-950 px-10 py-6 shadow-md ring-1 ring-zinc-900/20">
            <Image
              src="/brand/byredllc.png"
              alt="By Red, LLC."
              width={288}
              height={96}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="mt-6 text-4xl font-condensed font-bold text-zinc-900 tracking-tight lowercase">
            byred_os
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Reset your password
          </p>
        </div>

        <Card className="bg-white border-zinc-200 shadow-sm">
          <CardHeader className="pb-4">
            <p className="text-sm font-medium text-zinc-700">Forgot password</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-md border border-byred-red/30 bg-byred-red/5">
                  <AlertOctagon className="w-4 h-4 text-byred-red shrink-0 mt-0.5" strokeWidth={1.75} />
                  <p className="text-xs text-byred-red">{error}</p>
                </div>
              )}

              <p className="text-xs text-zinc-500">
                Enter your email and we&apos;ll send a link to reset your password.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-zinc-600 text-xs">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white border-zinc-300 text-zinc-800 placeholder:text-zinc-400 focus-visible:ring-byred-red"
                  placeholder="you@byred.co"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-byred-red hover:bg-byred-red-hot active:bg-byred-red-deep text-white font-medium focus-visible:ring-byred-red"
              >
                {loading ? "Sending..." : "Send reset link"}
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-zinc-400">
          By Red, LLC &middot; {year}
        </p>
      </div>
    </div>
  )
}
