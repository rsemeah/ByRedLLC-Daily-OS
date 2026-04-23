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

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  orgName: z.string().max(120).optional(),
  email: z.string().email("Enter a valid email address"),
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

      router.push("/")
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign up failed"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const year = new Date().getFullYear()

  if (checkEmail) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-lg font-medium text-zinc-900">Check your email</h1>
          <p className="text-sm text-zinc-600">
            We sent a confirmation link. After you confirm, you can sign in. Each account gets its own
            workspace; data stays separate per organization.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
        <p className="mt-8 text-center text-xs text-zinc-400">By Red, LLC · {year}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
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
          <p className="mt-1 text-sm text-zinc-500">Create an account. Your data stays in your org.</p>
        </div>

        <Card className="bg-white border-zinc-200 shadow-sm">
          <CardHeader className="pb-4">
            <p className="text-sm font-medium text-zinc-700">Create account</p>
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
                <Label htmlFor="name" className="text-zinc-600 text-xs">Your name</Label>
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white border-zinc-300 text-zinc-800"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="org" className="text-zinc-600 text-xs">
                  Organization <span className="text-zinc-400">(optional)</span>
                </Label>
                <Input
                  id="org"
                  type="text"
                  autoComplete="organization"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="bg-white border-zinc-300 text-zinc-800"
                  placeholder="e.g. Acme LLC"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-zinc-600 text-xs">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white border-zinc-300 text-zinc-800"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-zinc-600 text-xs">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white border-zinc-300 text-zinc-800"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-byred-red hover:bg-byred-red-hot text-white"
              >
                {loading ? "Creating account…" : "Create account"}
              </Button>

              <p className="text-center text-xs text-zinc-500">
                Already have an account?{" "}
                <Link href="/login" className="text-zinc-800 underline underline-offset-2">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-zinc-400">By Red, LLC · {year}</p>
      </div>
    </div>
  )
}
