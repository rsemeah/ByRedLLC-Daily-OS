import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/types/database"
import { isInternalMember } from "@/lib/auth/allowlist"

/**
 * Edge gate for the internal OS at app.byredllc.com.
 *
 * Two checks run on every protected route before React mounts:
 *   1) Session present? If not, redirect to /login.
 *   2) Session email in BYRED_INTERNAL_EMAILS? If not, redirect to
 *      /auth/error?code=not_authorized.
 *
 * Public auth paths (`/login`, `/register`, `/forgot-password`,
 * `/reset-password`, `/auth/*`, `/api/auth/*`, `/onboarding`) are skipped
 * via the `matcher` below, so unauth'd users can still recover access.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    // Fail open to /login rather than 500 on a misconfigured deploy — the
    // login page itself will surface the missing-env state via its own UI.
    return NextResponse.redirect(new URL("/login", request.url))
  }

  type CookieWrite = {
    name: string
    value: string
    options?: Record<string, unknown>
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: CookieWrite[]) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (!isInternalMember(user.email)) {
    const errorUrl = new URL("/auth/error", request.url)
    errorUrl.searchParams.set("code", "not_authorized")
    return NextResponse.redirect(errorUrl)
  }

  return response
}

/**
 * Match everything except public auth routes, static assets, and Next
 * internals. The gated routes are the protected app pages and API handlers
 * that mutate tenant data. Public marketing copy lives on a different
 * domain so it never enters this matcher.
 */
export const config = {
  matcher: [
    "/((?!login|register|forgot-password|reset-password|onboarding|auth|api/auth|api/health|api/webhooks|api/cron|_next|favicon.ico|brand|.*\\..*).*)",
  ],
}
