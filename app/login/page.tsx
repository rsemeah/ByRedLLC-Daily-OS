"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AlertOctagon } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { z } from "zod"
import { toast } from "sonner"

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export default function LoginPage() {
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
      const message = validation.error.issues[0]?.message ?? "Invalid login payload"
      setError(message)
      toast.error(message)
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password,
      })

      if (authError) {
        setError(authError.message)
        toast.error(authError.message)
        setLoading(false)
        return
      }

      router.push("/")
      router.refresh()
    } catch (authException) {
      const message =
        authException instanceof Error ? authException.message : "Sign-in failed unexpectedly"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo: PNG is authored for dark backgrounds — nest on a dark plate so it reads on this light page */}
        <div className="flex flex-col items-center">
          <div className="rounded-2xl bg-zinc-950 px-10 py-6 shadow-md ring-1 ring-zinc-900/20">
            <Image
              src="/brand/by-red-logo.png"
              alt="By Red, LLC."
              width={240}
              height={96}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="mt-6 text-4xl font-condensed font-bold text-zinc-900 tracking-tight lowercase">
            byred_os
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Internal operations. Execution, not ambition.
          </p>
        </div>

        {/* Auth card */}
        <Card className="bg-white border-zinc-200 shadow-sm">
          <CardHeader className="pb-4">
            <p className="text-sm font-medium text-zinc-700">Sign in</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-md border border-byred-red/30 bg-byred-red/5">
                  <AlertOctagon className="w-4 h-4 text-byred-red shrink-0 mt-0.5" strokeWidth={1.75} />
                  <p className="text-xs text-byred-red">{error}</p>
                </div>
              )}

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

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-zinc-600 text-xs">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white border-zinc-300 text-zinc-800 placeholder:text-zinc-400 focus-visible:ring-byred-red"
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-byred-red hover:bg-byred-red-hot active:bg-byred-red-deep text-white font-medium focus-visible:ring-byred-red"
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>

              <div className="text-center">
                <Link
                  href="/forgot-password"
                  className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-400">
          By Red, LLC · {year}
        </p>
      </div>
    </div>
  )
}
