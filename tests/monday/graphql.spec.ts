import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const originalFetch = globalThis.fetch

beforeEach(() => {
  vi.resetModules()
  process.env.MONDAY_API_KEY = "test-token"
  // Keep tests deterministic and fast — no real 500ms backoff.
  vi.useFakeTimers({ toFake: ["setTimeout"] })
})

afterEach(() => {
  vi.useRealTimers()
  globalThis.fetch = originalFetch
})

async function runWithFetchSequence(
  responses: Array<(() => Response | Promise<Response>)>
) {
  let attempt = 0
  const fetchMock = vi.fn(async () => {
    const resp = responses[attempt]
    if (!resp) throw new Error(`unexpected fetch #${attempt + 1}`)
    attempt += 1
    return resp()
  })
  globalThis.fetch = fetchMock as unknown as typeof fetch

  const { mondayGraphql } = await import("@/lib/monday/graphql")

  const promise = mondayGraphql<{ ok: number }>({
    query: "{ ok }",
    maxAttempts: 3,
    timeoutMs: 1_000,
  })
  // Run any retry timers synchronously.
  await vi.runAllTimersAsync()
  return { result: await promise, fetchMock }
}

function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  })
}

describe("mondayGraphql retry policy", () => {
  it("retries on 500 and succeeds when the next attempt is 200", async () => {
    const { result, fetchMock } = await runWithFetchSequence([
      () => jsonResponse(500, { error: "boom" }),
      () => jsonResponse(200, { data: { ok: 1 } }),
    ])
    expect(result).toEqual({ ok: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("retries on 429 honoring Retry-After seconds", async () => {
    const { result, fetchMock } = await runWithFetchSequence([
      () => jsonResponse(429, { error: "slow down" }, { "retry-after": "0" }),
      () => jsonResponse(200, { data: { ok: 2 } }),
    ])
    expect(result).toEqual({ ok: 2 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("does not retry on a hard 400 (client bug)", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(400, { error_message: "bad" }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const { mondayGraphql } = await import("@/lib/monday/graphql")
    await expect(
      mondayGraphql({ query: "{ x }", maxAttempts: 3 })
    ).rejects.toThrow(/Monday API HTTP 400/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("retries a GraphQL error with a retryable extensions.code", async () => {
    const { result, fetchMock } = await runWithFetchSequence([
      () =>
        jsonResponse(200, {
          errors: [
            { message: "Complexity budget exhausted", extensions: { code: "complexity_budget_exhausted" } },
          ],
        }),
      () => jsonResponse(200, { data: { ok: 3 } }),
    ])
    expect(result).toEqual({ ok: 3 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("does not retry a GraphQL error without a retryable code", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, { errors: [{ message: "user_not_found" }] })
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const { mondayGraphql } = await import("@/lib/monday/graphql")
    await expect(
      mondayGraphql({ query: "{ x }", maxAttempts: 3 })
    ).rejects.toThrow(/user_not_found/)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe("mondayGraphql token validation", () => {
  it("fails immediately when neither MONDAY_API_KEY nor MONDAY_TOKEN is set", async () => {
    vi.resetModules()
    delete process.env.MONDAY_API_KEY
    delete process.env.MONDAY_TOKEN
    const { mondayGraphql } = await import("@/lib/monday/graphql")
    await expect(mondayGraphql({ query: "{ x }" })).rejects.toThrow(
      /Monday API token is not configured/
    )
  })
})
