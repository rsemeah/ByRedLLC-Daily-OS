import { updateSession } from "@/lib/supabase/middleware"
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/types/database"

function getPublicEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function isProtectedPath(pathname: string): boolean {
  if (pathname === "/") {
    return true
  }

  const protectedPrefixes = ["/today", "/tasks", "/leads", "/activities", "/tenants", "/settings"]
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function cloneCookies(from: NextResponse, to: NextResponse): void {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie)
  })
}

export async function middleware(request: NextRequest) {
  const sessionResponse = await updateSession(request)
  const pathname = request.nextUrl.pathname

  const supabase = createServerClient<Database>(
    getPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // Middleware cookie updates are handled inside updateSession.
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    const redirectResponse = NextResponse.redirect(url)
    cloneCookies(sessionResponse, redirectResponse)
    return redirectResponse
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    const redirectResponse = NextResponse.redirect(url)
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
