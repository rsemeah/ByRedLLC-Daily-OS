'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { AlertOctagon } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Simulate auth — in production this would call Supabase Auth
    await new Promise((r) => setTimeout(r, 600))

    if (!email || !password) {
      setError('Email and password are required.')
      setLoading(false)
      return
    }

    router.push('/')
  }

  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center">
          <Image
            src="/brand/by-red-logo.png"
            alt="By Red, LLC."
            width={240}
            height={96}
            className="object-contain"
            priority
          />
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
                {loading ? 'Signing in…' : 'Sign in'}
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
