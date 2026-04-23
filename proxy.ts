import { updateSession } from "@/lib/supabase/middleware"
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/types/database"

function isProtectedPath(pathname: string): boolean {
  if (pathname === "/") {
    return true
  }

  const protectedPrefixes = [
    "/today",
    "/tasks",
    "/leads",
    "/activities",
    "/tenants",
    "/settings",
    "/integrations",
  ]
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function cloneCookies(from: NextResponse, to: NextResponse): void {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie)
  })
}

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL")
  }
  if (!anonKey) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  const sessionResponse = await updateSession(request)
  const pathname = request.nextUrl.pathname

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll() {
        // Middleware cookie updates are handled inside updateSession.
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && isProtectedPath(pathname)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    const redirectResponse = NextResponse.redirect(redirectUrl)
    cloneCookies(sessionResponse, redirectResponse)
    return redirectResponse
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/"
    const redirectResponse = NextResponse.redirect(redirectUrl)
    cloneCookies(sessionResponse, redirectResponse)
    return redirectResponse
  }

  return sessionResponse
}

export const config = {
  matcher: [
    "/((?!api/webhooks|api/cron|auth/callback|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
