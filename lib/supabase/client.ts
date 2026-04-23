import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database"

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient<Database>>

let browserClient: BrowserSupabaseClient | undefined

export function createClient(): BrowserSupabaseClient {
  if (browserClient) {
    return browserClient
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL")
  }
  if (!anonKey) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  browserClient = createBrowserClient<Database>(url, anonKey)

  return browserClient
}
