"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { Database } from "@/types/database"

type ByredUserTableUpdate = Database["public"]["Tables"]["byred_users"]["Update"]

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient()
  const fullName = formData.get("fullName") as string

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return { error: "Not authenticated" }
  }

  const patch: ByredUserTableUpdate = { name: fullName }

  const { error } = await supabase
    .from("byred_users")
    // `createServerClient` typing can resolve `.update` as `never` for this table; `patch` is still `Update`.
    .update(patch as never)
    .eq("auth_user_id", authUser.id)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
