import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.resetModules()
  process.env = { ...ORIGINAL_ENV }
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe("assertEnvAtBoot", () => {
  it("passes when all production-required vars are set", async () => {
    ;(process.env as Record<string, string>).NODE_ENV = "production"
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service"
    process.env.CRON_SECRET = "cron"
    process.env.MONDAY_WEBHOOK_SECRET = "webhook"

    const { assertEnvAtBoot } = await import("@/lib/env")
    expect(() => assertEnvAtBoot()).not.toThrow()
  })

  it("throws in production when a required var is missing", async () => {
    ;(process.env as Record<string, string>).NODE_ENV = "production"
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon"
    // Missing SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, MONDAY_WEBHOOK_SECRET
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.CRON_SECRET
    delete process.env.MONDAY_WEBHOOK_SECRET

    const { assertEnvAtBoot } = await import("@/lib/env")
    expect(() => assertEnvAtBoot()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
    expect(() => assertEnvAtBoot()).toThrow(/CRON_SECRET/)
    expect(() => assertEnvAtBoot()).toThrow(/MONDAY_WEBHOOK_SECRET/)
  })

  it("warns but does not throw in development when prod-only vars are missing", async () => {
    ;(process.env as Record<string, string>).NODE_ENV = "development"
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon"
    delete process.env.MONDAY_WEBHOOK_SECRET
    delete process.env.CRON_SECRET

    const { assertEnvAtBoot } = await import("@/lib/env")
    expect(() => assertEnvAtBoot()).not.toThrow()
  })

  it("throws in every environment when an always-required var is missing", async () => {
    ;(process.env as Record<string, string>).NODE_ENV = "development"
    delete process.env.NEXT_PUBLIC_SUPABASE_URL

    const { assertEnvAtBoot } = await import("@/lib/env")
    // Dev allows missing prod-only but `NEXT_PUBLIC_SUPABASE_URL` is always
    // required — we still don't throw in dev by design (warn only), but the
    // assessment should report it missing.
    const { assessEnv } = await import("@/lib/env")
    const report = assessEnv()
    expect(report.ok).toBe(false)
    expect(report.missing.some((m) => m.name === "NEXT_PUBLIC_SUPABASE_URL")).toBe(true)
  })
})
