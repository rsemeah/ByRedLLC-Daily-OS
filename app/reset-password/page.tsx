import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ResetPasswordForm } from "./form"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * A valid Supabase session cookie is required to change the password.
 * The recovery-email callback (`/auth/callback?token_hash=…&type=recovery`)
 * sets that cookie via `verifyOtp`. If no session is present, the user
 * landed here without completing the email verification — bounce them
 * back rather than letting `updateUser` fail mysteriously.
 */
export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/forgot-password?expired=1")
  }

  return <ResetPasswordForm />
}
