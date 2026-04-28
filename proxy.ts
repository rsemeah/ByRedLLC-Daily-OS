import { updateSession } from "@/lib/supabase/middleware"
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/types/database"
import { isInternalMember } from "@/lib/auth/allowlist"

function isProtectedPath(pathname: string): boolean {
  if (pathname === "/") return true

  const protectedPrefixes = [
    "/dashboard",
    "/today",
    "/tasks",
    "/leads",
    "/activities",
    "/tenants",
    "/settings",
    "/integrations",
  ]
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

function cloneCookies(from: NextResponse, to: NextResponse): void {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie)
  })
}

/**
 * Edge gate for the internal OS at app.byredllc.com.
 *
 * Three checks run on every protected route before React mounts:
 *   1) Env vars present? If not, redirect to /login gracefully.
 *   2) Session present? If not, redirect to /login with ?next=.
 *   3) Session email in BYRED_INTERNAL_EMAILS? If not, redirect to
 *      /auth/error?code=not_authorized.
 *
 * Public auth paths are excluded via the matcher below.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const sessionResponse = await updateSession(request)
  const pathname = request.nextUrl.pathname

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll() {},
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && isProtectedPath(pathname)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set("next", pathname)
    const redirectResponse = NextResponse.redirect(redirectUrl)
    cloneCookies(sessionResponse, redirectResponse)
    return redirectResponse
  }

  if (user && !isInternalMember(user.email) && isProtectedPath(pathname)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/auth/error"
    redirectUrl.searchParams.set("code", "not_authorized")
    const redirectResponse = NextResponse.redirect(redirectUrl)
    cloneCookies(sessionResponse, redirectResponse)
    return redirectResponse
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/dashboard"
    const redirectResponse = NextResponse.redirect(redirectUrl)
    cloneCookies(sessionResponse, redirectResponse)
    return redirectResponse
  }

  return sessionResponse
}

export const config = {
  matcher: [
    "/((?!login|register|forgot-password|reset-password|onboarding|auth|api/auth|api/health|api/webhooks|api/cron|_next|favicon.ico|brand|.*\\..*).*)",
  ],
}
