import "server-only"

import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import type { SupabaseClient } from "@supabase/supabase-js"

export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL")
  }
  if (!serviceKey) {
    throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY")
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
