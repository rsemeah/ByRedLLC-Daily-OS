"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, ShieldOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

type ErrorCopy = {
  icon: "shield" | "alert"
  title: string
  body: string
}

function copyForCode(code: string | null): ErrorCopy {
  switch (code) {
    case "not_authorized":
      return {
        icon: "shield",
        title: "Restricted to By Red LLC members",
        body: "This workspace is for internal By Red LLC operators only. If you believe you should have access, contact KP to be added to the allowlist.",
      }
    case "reset_link_expired":
      return {
        icon: "alert",
        title: "Password reset link expired",
        body: "That reset link has expired or was already used. Request a fresh one from the login page.",
      }
    case "missing_code":
    case "auth_callback_failed":
    case "auth_callback_exception":
    default:
      return {
        icon: "alert",
        title: "Authentication error",
        body: "There was a problem signing you in. Please try again.",
      }
  }
}

function AuthErrorContent() {
  const params = useSearchParams()
  const code = params.get("code")
  const { icon, title, body } = copyForCode(code)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (code !== "not_authorized") return
    const supabase = createClient()
    void supabase.auth.signOut()
  }, [code])

  async function handleSignOutAndRetry() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        {icon === "shield" ? (
          <ShieldOff className="h-8 w-8 text-destructive" />
        ) : (
          <AlertTriangle className="h-8 w-8 text-destructive" />
        )}
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-muted-foreground">{body}</p>
      </div>
      {code === "not_authorized" ? (
        <Button
          className="w-full"
          onClick={handleSignOutAndRetry}
          disabled={signingOut}
        >
          {signingOut ? "Signing out…" : "Sign in with a different account"}
        </Button>
      ) : (
        <Button asChild className="w-full">
          <Link href="/login">Back to Login</Link>
        </Button>
      )}
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Suspense>
        <AuthErrorContent />
      </Suspense>
    </div>
  )
}
