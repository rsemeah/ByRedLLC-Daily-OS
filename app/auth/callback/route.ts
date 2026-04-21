import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (!code) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("error", "missing_code")
    return NextResponse.redirect(loginUrl)
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("error", "auth_callback_failed")
      return NextResponse.redirect(loginUrl)
    }

    const redirectUrl = new URL(next, request.url)
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error("Auth callback exchange failed", error)
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("error", "auth_callback_exception")
    return NextResponse.redirect(loginUrl)
  }
}
