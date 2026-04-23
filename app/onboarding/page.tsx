"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import type { ByredUser } from "@/types/database"
import { Loader2 } from "lucide-react"

const MAX_POLLS = 40
const INTERVAL_MS = 1500

/**
 * Shown when auth exists but byred profile / tenant membership is not ready yet
 * (e.g. DB trigger still running) or trigger failed to provision the account.
 */
export default function OnboardingPage() {
  const router = useRouter()
  const [ui, setUi] = useState<"wait" | "stuck" | "noauth">("wait")

  useEffect(() => {
    if (ui !== "wait") {
      return
    }

    const supabase = createClient()
    let cancelled = false
    let attempts = 0
    let intervalId: ReturnType<typeof setInterval> | null = null

    async function tick(): Promise<void> {
      if (cancelled) {
        return
      }
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setUi("noauth")
        if (intervalId) {
          clearInterval(intervalId)
        }
        return
      }

      const { data: profileData, error: profileErr } = await supabase
        .from("byred_users")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle()

      const profile = profileData as Pick<ByredUser, "id"> | null

      if (profileErr || !profile?.id) {
        attempts += 1
        if (attempts >= MAX_POLLS) {
          setUi("stuck")
          if (intervalId) {
            clearInterval(intervalId)
          }
        }
        return
      }

      const { data: members, error: mErr } = await supabase
        .from("byred_user_tenants")
        .select("tenant_id")
        .eq("user_id", profile.id)
        .limit(1)

      if (mErr || !members || members.length === 0) {
        attempts += 1
        if (attempts >= MAX_POLLS) {
          setUi("stuck")
          if (intervalId) {
            clearInterval(intervalId)
          }
        }
        return
      }

      if (intervalId) {
        clearInterval(intervalId)
      }
      router.replace("/")
      router.refresh()
    }

    void tick()
    intervalId = setInterval(() => {
      void tick()
    }, INTERVAL_MS)

    return () => {
      cancelled = true
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [router, ui])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (ui === "noauth") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 text-zinc-200">
        <p className="text-sm mb-4">You need to sign in first.</p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    )
  }

  if (ui === "stuck") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 text-center max-w-md">
        <p className="text-sm text-zinc-200 mb-2">We could not finish setting up your workspace.</p>
        <p className="text-xs text-zinc-500 mb-6">
          The account bootstrap trigger may be missing. In Supabase run the migration
          <code className="mx-1 text-zinc-300">20260421160000_auth_bootstrap_tenant.sql</code>
          in the SQL editor, or contact an admin.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setUi("wait")
            }}
          >
            Try again
          </Button>
          <Button type="button" variant="ghost" className="text-zinc-400" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-3 text-zinc-200">
      <Loader2 className="h-8 w-8 animate-spin text-byred-red" />
      <p className="text-sm">Preparing your workspace…</p>
    </div>
  )
}
