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

    if (!email || !password) {
      setError("Email and password are required.")
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-1">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatGPT%20Image%20Apr%2020%2C%202026%2C%2012_29_20%20PM-ATivvvRJFjDMpelGYEfLYkYncVvkIr.png"
            alt="By Red, LLC."
            width={200}
            height={80}
            className="object-contain"
            priority
          />
          <p className="text-[11px] font-semibold tracking-[0.3em] text-zinc-400 uppercase">
            Daily OS
          </p>
          <p className="mt-3 text-sm text-zinc-500">
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
