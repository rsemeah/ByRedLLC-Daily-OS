"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AlertOctagon, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { z } from "zod"
import { toast } from "sonner"

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  })

export default function ResetPasswordPage() {
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
        setError(updateError.message)
        toast.error(updateError.message)
        setLoading(false)
        return
      }

      setDone(true)
      toast.success("Password updated successfully")
      setTimeout(() => {
        router.push("/")
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

  const year = new Date().getFullYear()

  if (done) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" strokeWidth={1.75} />
          </div>
          <h1 className="text-lg font-medium text-zinc-900">Password updated</h1>
          <p className="text-sm text-zinc-600">
            Redirecting you to the dashboard...
          </p>
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
            Choose a new password
          </p>
        </div>

        <Card className="bg-white border-zinc-200 shadow-sm">
          <CardHeader className="pb-4">
            <p className="text-sm font-medium text-zinc-700">New password</p>
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
                <Label htmlFor="password" className="text-zinc-600 text-xs">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white border-zinc-300 text-zinc-800 placeholder:text-zinc-400 focus-visible:ring-byred-red"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-zinc-600 text-xs">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
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
                {loading ? "Updating..." : "Update password"}
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                >
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
