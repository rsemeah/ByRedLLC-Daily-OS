import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/observability/logger"
import type { EmailOtpType } from "@supabase/supabase-js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const EMAIL_OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]

function parseEmailOtpType(v: string | null): EmailOtpType | null {
  if (!v) return null
  return (EMAIL_OTP_TYPES as readonly string[]).includes(v)
    ? (v as EmailOtpType)
    : null
}

/**
 * Derive the origin the browser actually used, not the internal one the
 * Node server sees. Behind a tunnel/reverse proxy `request.url` is the
 * internal socket's host (`localhost:3000`), which is unreachable for
 * the client. Prefer `NEXT_PUBLIC_APP_URL`, else rebuild from forwarded
 * headers, else fall back to `request.url`.
 */
function publicOrigin(request: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (envUrl) return envUrl.replace(/\/$/, "")
  const proto = request.headers.get("x-forwarded-proto") ?? "https"
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    new URL(request.url).host
  return `${proto}://${host}`
}

/**
 * Keep auth metadata's active tenant aligned with DB membership.
 *
 * Why this matters for signup:
 * - New accounts are bootstrapped into `byred_users` + `byred_user_tenants`.
 * - If `user_metadata.active_tenant_id` is missing/stale, first-load tenant
 *   selection can drift until the user manually switches workspace.
 * - Persisting it here (right after auth callback) keeps account-to-tenant
 *   sync deterministic from the first signed-in request.
 */
async function syncAuthActiveTenantFromMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  log: ReturnType<typeof logger.child>
): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    if (userError) {
      log.warn("active_tenant_sync_get_user_failed", { reason: userError.message })
    }
    return
  }

  const currentActiveTenantId =
    typeof user.user_metadata?.active_tenant_id === "string"
      ? user.user_metadata.active_tenant_id
      : null

  const profileQuery = await supabase
    .from("byred_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  const profile = profileQuery.data as { id: string } | null
  const profileError = profileQuery.error

  if (profileError || !profile?.id) {
    if (profileError) {
      log.warn("active_tenant_sync_profile_lookup_failed", {
        reason: profileError.message,
      })
    }
    return
  }

  const membershipQuery = await supabase
    .from("byred_user_tenants")
    .select("tenant_id, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: true })
    .limit(1)

  const memberships = membershipQuery.data as
    | Array<{ tenant_id: string; created_at: string | null }>
    | null
  const membershipError = membershipQuery.error

  if (membershipError) {
    log.warn("active_tenant_sync_membership_lookup_failed", {
      reason: membershipError.message,
    })
    return
  }

  const expectedTenantId = memberships?.[0]?.tenant_id ?? null
  if (!expectedTenantId || currentActiveTenantId === expectedTenantId) {
    return
  }

  const metadata =
    user.user_metadata && typeof user.user_metadata === "object" ? user.user_metadata : {}
  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      ...metadata,
      active_tenant_id: expectedTenantId,
    },
  })

  if (updateError) {
    log.warn("active_tenant_sync_update_failed", { reason: updateError.message })
    return
  }

  log.info("active_tenant_synced", {
    previous_tenant_id: currentActiveTenantId,
    active_tenant_id: expectedTenantId,
  })
}

/**
 * Unified auth callback. Supports two Supabase email-auth flows:
 *
 *   1. OTP / token_hash (password recovery, magic link, email change) —
 *      `?token_hash=...&type=recovery|magiclink|email_change`. Uses
 *      `verifyOtp`, which does NOT require a PKCE code_verifier cookie,
 *      so the user can open the email on a different device/browser.
 *
 *   2. PKCE code exchange — `?code=...`. Standard OAuth/social-login flow;
 *      requires the code_verifier cookie set on the originating browser.
 *
 * Any auth failure redirects to /login with a non-sensitive error code.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const rawNext = searchParams.get("next") ?? "/"
  const log = logger.child({ component: "auth_callback" })

  const origin = publicOrigin(request)
  // Only honor relative `next` paths to prevent open-redirect.
  const safeNext = rawNext.startsWith("/") ? rawNext : "/"
  const nextUrl = new URL(safeNext, origin)

  function redirectToLoginWith(errorCode: string): NextResponse {
    const loginUrl = new URL("/login", origin)
    loginUrl.searchParams.set("error", errorCode)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const supabase = await createClient()

    const otpType = parseEmailOtpType(type)
    if (tokenHash && otpType) {
      const { error } = await supabase.auth.verifyOtp({
        type: otpType,
        token_hash: tokenHash,
      })
      if (error) {
        log.warn("verify_otp_failed", { type: otpType, reason: error.message })
        return redirectToLoginWith("reset_link_expired")
      }
      // Signup callback should pin the account to its provisioned tenant.
      if (otpType === "signup" || safeNext === "/onboarding") {
        await syncAuthActiveTenantFromMembership(supabase, log)
      }
      return NextResponse.redirect(nextUrl)
    }

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        log.warn("exchange_code_failed", { reason: error.message })
        return redirectToLoginWith("auth_callback_failed")
      }
      if (safeNext === "/onboarding") {
        await syncAuthActiveTenantFromMembership(supabase, log)
      }
      return NextResponse.redirect(nextUrl)
    }

    log.warn("missing_params")
    return redirectToLoginWith("missing_code")
  } catch (error) {
    log.error("callback_exception", {}, error)
    return redirectToLoginWith("auth_callback_exception")
  }
}
