import "server-only"

import { logger } from "@/lib/observability/logger"

/**
 * Runtime env contract. Imported by `instrumentation.ts` so this executes
 * exactly once per Node process boot — dev, prod, build, cron. Missing
 * production-required vars raise an error that Vercel will surface in the
 * deployment logs and that `/api/health` reports.
 *
 * Why not rely on `scripts/check-env.ts`? That only runs on `pnpm predev`.
 * A Vercel deployment ships whatever got built with whatever env Vercel
 * had configured at build time. Without a runtime assertion, a missing
 * SUPABASE_SERVICE_ROLE_KEY only fails the first request that uses it —
 * which may be a cron at 3am.
 */

type VarSpec = {
  name: string
  requiredIn: "always" | "production"
  description: string
}

const SPECS: VarSpec[] = [
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    requiredIn: "always",
    description: "Supabase project URL",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    requiredIn: "always",
    description: "Supabase anon key for RLS-scoped reads",
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    requiredIn: "production",
    description: "Supabase service role for cron, webhooks, admin paths",
  },
  {
    name: "CRON_SECRET",
    requiredIn: "production",
    description: "Bearer secret required for /api/sync/monday",
  },
  {
    name: "MONDAY_WEBHOOK_SECRET",
    requiredIn: "production",
    description:
      "Shared secret Monday must present on /api/webhooks/monday (header: Authorization: Bearer <secret>)",
  },
]

export type EnvReport = {
  ok: boolean
  missing: Array<{ name: string; description: string }>
}

export function assessEnv(): EnvReport {
  const isProd = process.env.NODE_ENV === "production"
  const missing: EnvReport["missing"] = []

  for (const spec of SPECS) {
    if (spec.requiredIn === "production" && !isProd) continue
    const v = process.env[spec.name]?.trim()
    if (!v) missing.push({ name: spec.name, description: spec.description })
  }

  return { ok: missing.length === 0, missing }
}

/**
 * Invoked at process boot via `instrumentation.ts`. In production, a
 * missing required var throws — this surfaces in Vercel logs and short-
 * circuits start-up before the first request gets routed to a broken
 * handler. In dev, we only warn so you can keep iterating.
 */
export function assertEnvAtBoot(): void {
  const report = assessEnv()
  if (report.ok) {
    logger.info("env.ok", {
      node_env: process.env.NODE_ENV,
      checked: SPECS.length,
    })
    return
  }

  const detail = {
    node_env: process.env.NODE_ENV,
    missing: report.missing,
  }

  if (process.env.NODE_ENV === "production") {
    logger.error("env.missing_required", detail)
    const names = report.missing.map((m) => m.name).join(", ")
    throw new Error(
      `Refusing to boot: required environment variables missing — ${names}`
    )
  }

  logger.warn("env.missing_optional", detail)
}
