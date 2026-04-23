/**
 * Reset a Supabase auth user's password without exposing the password in
 * shell history or process args.
 *
 * Usage:
 *   RESET_PASSWORD=<new-password> pnpm reset:password <email>
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (loaded via --env-file).
 */

import { createClient } from "@supabase/supabase-js"

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const email = process.argv[2]
  const password = process.env.RESET_PASSWORD

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL")
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")
  if (!email) throw new Error("Usage: RESET_PASSWORD=<pw> pnpm reset:password <email>")
  if (!password) throw new Error("Missing RESET_PASSWORD env var (keeps password out of shell history)")
  if (password.length < 12) throw new Error("RESET_PASSWORD must be at least 12 characters")

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const target = email.trim().toLowerCase()
  const perPage = 200
  let user: { id: string; email: string | undefined } | null = null

  for (let page = 1; page < 500; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`listUsers failed: ${error.message}`)
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === target)
    if (hit) {
      user = { id: hit.id, email: hit.email ?? undefined }
      break
    }
    if (data.users.length < perPage) break
  }

  if (!user) throw new Error(`No auth user found for ${email}`)

  const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
  })
  if (updateErr) throw new Error(`updateUserById failed: ${updateErr.message}`)

  console.log(`Password reset for ${user.email ?? email} (user id: ${user.id})`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`reset-password failed: ${message}`)
  process.exit(1)
})
