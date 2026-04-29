import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

type CookieWrite = {
  name: string
  value: string
  options?: Record<string, unknown>
}

export async function createClient(): Promise<SupabaseClient<Database>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL")
  }
  if (!anonKey) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  const cookieStore = await cookies()

  // @supabase/ssr@0.6.x and @supabase/supabase-js@2.104+ have mismatched
  // SupabaseClient generic arities. The runtime client is correct; cast to
  // supabase-js's SupabaseClient<Database> so the query builder resolves tables.
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: CookieWrite[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch (error) {
          console.error("Failed to set Supabase cookies in server context", error)
        }
      },
    },
  }) as unknown as SupabaseClient<Database>
}
