import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { logger } from "@/lib/observability/logger"

type SupabaseAdmin = ReturnType<typeof createAdminClient>

export type SyncLockHandle = {
  name: string
  holder: string
  release: () => Promise<void>
}

/**
 * Try to acquire a cross-process sync lock. Returns a handle on success,
 * or `null` if another process holds the lock. Callers should no-op on
 * null (do not block). TTL protects against crashed holders.
 */
export async function tryAcquireSyncLock(opts: {
  name: string
  ttlSeconds?: number
  admin?: SupabaseAdmin
}): Promise<SyncLockHandle | null> {
  const admin = opts.admin ?? createAdminClient()
  const holder = `${process.env.VERCEL_REGION ?? "local"}:${crypto.randomUUID()}`
  const ttlSeconds = opts.ttlSeconds ?? 300 // 5 min — longer than any sane cron run.

  const { data, error } = await admin.rpc("byred_try_sync_lock", {
    p_name: opts.name,
    p_holder: holder,
    p_ttl_seconds: ttlSeconds,
  })

  if (error) {
    throw new Error(`sync_lock acquire failed: ${error.message}`)
  }

  if (data !== true) return null

  return {
    name: opts.name,
    holder,
    release: async () => {
      const { error: relErr } = await admin.rpc("byred_release_sync_lock", {
        p_name: opts.name,
        p_holder: holder,
      })
      if (relErr) {
        logger.warn("sync_lock.release_failed", {
          name: opts.name,
          holder,
          error: relErr.message,
        })
      }
    },
  }
}
