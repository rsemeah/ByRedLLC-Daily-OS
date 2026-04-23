import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { mondayGraphql } from "@/lib/monday/graphql"
import { logger } from "@/lib/observability/logger"

type MondayUser = {
  id: string
  name: string
  email: string
  enabled: boolean
  photo_original: string | null
  photo_thumb: string | null
}

type MondayUsersResp = {
  users: MondayUser[]
}

export type MondayUserSyncResult = {
  fetched: number
  matched: number
  imported: number
  updated: number
  errors: number
}

/**
 * Fetch every Monday workspace user and reconcile to byred_users.
 *
 * Reconciliation rules, in order:
 *   1. `monday_user_id` match → UPDATE name / email / avatar_url.
 *   2. lower(email) match     → UPDATE (stamp monday_user_id, avatar_url).
 *      Keeps existing auth-linked users anchored to their Supabase auth row.
 *   3. No match → INSERT a `source='monday_import'` row. These rows exist
 *      purely so tasks have a resolvable owner; they cannot log in until
 *      somebody creates a Supabase auth account with the matching email.
 *
 * Never overwrites avatar_url that was uploaded in-app: the heuristic is
 * "only replace avatar_url when the current value is null or looks like a
 * Monday CDN URL". Keeps user-uploaded pics sticky.
 */
export async function syncMondayUsersToByred(): Promise<MondayUserSyncResult> {
  const res = await mondayGraphql<MondayUsersResp>({
    query: `
      query {
        users(limit: 500) {
          id
          name
          email
          enabled
          photo_original
          photo_thumb
        }
      }
    `,
  })

  const monday = res.users.filter((u) => u.email?.trim())
  const totals: MondayUserSyncResult = {
    fetched: monday.length,
    matched: 0,
    imported: 0,
    updated: 0,
    errors: 0,
  }

  const admin = createAdminClient()
  const log = logger.child({ component: "monday_users_sync" })

  const { data: byredRows, error: loadErr } = await admin
    .from("byred_users")
    .select("id, name, email, avatar_url, monday_user_id, source")

  if (loadErr) {
    throw new Error(`byred_users load: ${loadErr.message}`)
  }

  type ByredRow = {
    id: string
    name: string
    email: string
    avatar_url: string | null
    monday_user_id: string | null
    source: string
  }

  const rows = (byredRows ?? []) as ByredRow[]
  const byMondayId = new Map<string, ByredRow>()
  const byEmailLower = new Map<string, ByredRow>()
  for (const r of rows) {
    if (r.monday_user_id) byMondayId.set(String(r.monday_user_id), r)
    if (r.email) byEmailLower.set(r.email.trim().toLowerCase(), r)
  }

  for (const mu of monday) {
    const pic = mu.photo_original ?? mu.photo_thumb
    const email = mu.email.trim().toLowerCase()
    const name = mu.name?.trim() || mu.email

    const hit =
      byMondayId.get(String(mu.id)) ?? byEmailLower.get(email) ?? null

    if (hit) {
      // Only clobber avatar_url when we're not erasing a user-uploaded one.
      const avatarShouldUpdate =
        pic && (!hit.avatar_url || looksLikeMondayUrl(hit.avatar_url))

      const patch: Record<string, unknown> = {
        monday_user_id: String(mu.id),
      }
      if (!hit.name || hit.name === hit.email) patch.name = name
      if (avatarShouldUpdate) patch.avatar_url = pic

      if (Object.keys(patch).length === 0) {
        totals.matched += 1
        continue
      }

      const { error } = await admin
        .from("byred_users")
        .update(patch as never)
        .eq("id", hit.id)

      if (error) {
        totals.errors += 1
        log.error("user_update_failed", { id: hit.id, email }, error)
      } else {
        totals.updated += 1
      }
      continue
    }

    // Brand-new row. auth_user_id stays NULL; this user cannot log in until
    // a Supabase auth row is created with a matching email.
    const { error } = await admin.from("byred_users").insert({
      email,
      name,
      role: "member",
      active: mu.enabled,
      avatar_url: pic,
      source: "monday_import",
      monday_user_id: String(mu.id),
    } as never)

    if (error) {
      totals.errors += 1
      log.error("user_insert_failed", { email, monday_user_id: mu.id }, error)
    } else {
      totals.imported += 1
    }
  }

  log.info("ok", { ...totals })
  return totals
}

function looksLikeMondayUrl(url: string): boolean {
  return /monday\.com|mondayusercontent|cloudfront\.net/.test(url)
}

/**
 * Resolve a set of Monday emails to byred_users ids. Triggers a Monday
 * users sync on any miss so the pull-sync is self-healing.
 */
export async function resolveByredUserIdsByEmail(
  emails: string[]
): Promise<Map<string, string>> {
  const norm = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))]
  if (norm.length === 0) return new Map()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("byred_users")
    .select("id, email")
    .in("email", norm)
  if (error) throw new Error(`byred_users resolve: ${error.message}`)

  const out = new Map<string, string>()
  for (const r of (data ?? []) as Array<{ id: string; email: string }>) {
    out.set(r.email.toLowerCase(), r.id)
  }

  const missing = norm.filter((e) => !out.has(e))
  if (missing.length > 0) {
    // One-shot re-sync. If emails still don't match after, we log and move on.
    try {
      await syncMondayUsersToByred()
      const { data: after } = await admin
        .from("byred_users")
        .select("id, email")
        .in("email", missing)
      for (const r of (after ?? []) as Array<{ id: string; email: string }>) {
        out.set(r.email.toLowerCase(), r.id)
      }
    } catch (e) {
      logger.warn("resolve_emails.resync_failed", { emails: missing }, e)
    }
  }

  return out
}
