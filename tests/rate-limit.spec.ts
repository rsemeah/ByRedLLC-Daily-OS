import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

beforeEach(() => {
  vi.resetModules()
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://test.local"
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key"
})

afterEach(() => {
  vi.resetModules()
})

function mockAdminRpc(rpc: ReturnType<typeof vi.fn>) {
  vi.doMock("@/lib/supabase/admin", () => ({
    createAdminClient: () => ({ rpc }),
  }))
}

describe("rateLimit", () => {
  it("returns allowed=true when the DB allows the event", async () => {
    const rpc = vi.fn(async () => ({
      data: [{ allowed: true, remaining: 4, retry_after_s: 0 }],
      error: null,
    }))
    mockAdminRpc(rpc)
    const { rateLimit } = await import("@/lib/rate-limit")
    const res = await rateLimit({
      key: "test:abc",
      maxEvents: 5,
      windowSeconds: 60,
    })
    expect(res).toEqual({ allowed: true, remaining: 4, retryAfterSeconds: 0 })
    expect(rpc).toHaveBeenCalledWith("byred_rate_limit_try", {
      p_key: "test:abc",
      p_max_events: 5,
      p_window_seconds: 60,
    })
  })

  it("returns allowed=false with a positive retryAfter when rate-limited", async () => {
    const rpc = vi.fn(async () => ({
      data: [{ allowed: false, remaining: 0, retry_after_s: 42 }],
      error: null,
    }))
    mockAdminRpc(rpc)
    const { rateLimit } = await import("@/lib/rate-limit")
    const res = await rateLimit({ key: "k", maxEvents: 1, windowSeconds: 60 })
    expect(res).toEqual({ allowed: false, remaining: 0, retryAfterSeconds: 42 })
  })

  it("fails open when the RPC returns an error (never locks real users out)", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { message: "connection refused" },
    }))
    mockAdminRpc(rpc)
    const { rateLimit } = await import("@/lib/rate-limit")
    const res = await rateLimit({ key: "k", maxEvents: 1, windowSeconds: 60 })
    expect(res.allowed).toBe(true)
  })

  it("fails open when the admin client throws", async () => {
    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminClient: () => {
        throw new Error("missing env var")
      },
    }))
    const { rateLimit } = await import("@/lib/rate-limit")
    const res = await rateLimit({ key: "k", maxEvents: 1, windowSeconds: 60 })
    expect(res.allowed).toBe(true)
  })
})

describe("rateLimitLogin", () => {
  it("builds a normalized (email, ip) key", async () => {
    const rpc = vi.fn(async () => ({
      data: [{ allowed: true, remaining: 9, retry_after_s: 0 }],
      error: null,
    }))
    mockAdminRpc(rpc)
    const { rateLimitLogin } = await import("@/lib/rate-limit")
    await rateLimitLogin({ email: "  KP@ByRed.dev  ", ip: "1.2.3.4" })
    expect(rpc).toHaveBeenCalledWith("byred_rate_limit_try", {
      p_key: "login:kp@byred.dev:1.2.3.4",
      p_max_events: 10,
      p_window_seconds: 300,
    })
  })

  it("falls back to `unknown` when no IP header is present", async () => {
    const rpc = vi.fn(async () => ({
      data: [{ allowed: true, remaining: 9, retry_after_s: 0 }],
      error: null,
    }))
    mockAdminRpc(rpc)
    const { rateLimitLogin } = await import("@/lib/rate-limit")
    await rateLimitLogin({ email: "kp@byred.dev", ip: null })
    expect(rpc).toHaveBeenCalledWith(
      "byred_rate_limit_try",
      expect.objectContaining({ p_key: "login:kp@byred.dev:unknown" })
    )
  })
})
