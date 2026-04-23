import "server-only"

const MONDAY_API_URL = "https://api.monday.com/v2"

// Tuned for Monday's published SLAs:
// - per-request hard cap of 20s (P99 is well under 5s)
// - 3 attempts with exponential backoff + jitter
// - only retry transient classes (network, 5xx, 429)
const DEFAULT_TIMEOUT_MS = 20_000
const MAX_ATTEMPTS = 3
const BASE_BACKOFF_MS = 500

export type MondayGraphQLError = { message: string; extensions?: Record<string, unknown> }

class MondayTransientError extends Error {
  readonly retryAfterMs: number | null
  constructor(message: string, retryAfterMs: number | null = null) {
    super(message)
    this.name = "MondayTransientError"
    this.retryAfterMs = retryAfterMs
  }
}

function jitter(ms: number): number {
  return ms + Math.floor(Math.random() * ms * 0.25)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null
  const seconds = Number(header)
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000
  const date = Date.parse(header)
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now())
  return null
}

async function onceMondayGraphql<T>(options: {
  query: string
  variables?: Record<string, unknown>
  timeoutMs: number
}): Promise<T> {
  const token =
    process.env.MONDAY_API_KEY?.trim() || process.env.MONDAY_TOKEN?.trim()
  if (!token) {
    throw new Error("Monday API token is not configured (set MONDAY_API_KEY or MONDAY_TOKEN).")
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs)

  let res: Response
  try {
    res = await fetch(MONDAY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({
        query: options.query,
        variables: options.variables ?? {},
      }),
      signal: controller.signal,
    })
  } catch (e) {
    clearTimeout(timer)
    if ((e as { name?: string })?.name === "AbortError") {
      throw new MondayTransientError(`Monday API timeout after ${options.timeoutMs}ms`)
    }
    // DNS, ECONNRESET, socket hangup — all transient.
    throw new MondayTransientError(
      `Monday API network error: ${e instanceof Error ? e.message : String(e)}`
    )
  }
  clearTimeout(timer)

  if (res.status === 429) {
    throw new MondayTransientError(
      "Monday API rate limited (429).",
      parseRetryAfter(res.headers.get("retry-after"))
    )
  }
  if (res.status >= 500) {
    throw new MondayTransientError(`Monday API HTTP ${res.status}.`)
  }

  let body: { data?: T; errors?: MondayGraphQLError[]; error_code?: string; error_message?: string }
  try {
    body = (await res.json()) as typeof body
  } catch {
    throw new Error(`Monday API returned non-JSON response (HTTP ${res.status}).`)
  }

  if (!res.ok) {
    // 4xx other than 429 is a caller bug — don't retry.
    throw new Error(
      `Monday API HTTP ${res.status}: ${body.error_message ?? body.error_code ?? "unknown"}`
    )
  }

  if (body.errors?.length) {
    // Monday returns 200 for GraphQL errors. Some of these are retryable
    // (complexity budget, temporary internal error); most are not.
    const msg = body.errors.map((e) => e.message).join("; ")
    const retryable = body.errors.some((e) => {
      const code = String((e.extensions as { code?: string } | undefined)?.code ?? "").toLowerCase()
      return (
        code.includes("complexity_budget_exhausted") ||
        code.includes("rate_limit") ||
        code.includes("internal") ||
        msg.toLowerCase().includes("please try again")
      )
    })
    if (retryable) throw new MondayTransientError(msg)
    throw new Error(msg)
  }

  if (body.data === undefined) {
    throw new Error("Monday API returned no data.")
  }

  return body.data
}

export async function mondayGraphql<T>(options: {
  query: string
  variables?: Record<string, unknown>
  timeoutMs?: number
  maxAttempts?: number
}): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const maxAttempts = Math.max(1, options.maxAttempts ?? MAX_ATTEMPTS)

  let lastErr: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await onceMondayGraphql<T>({
        query: options.query,
        variables: options.variables,
        timeoutMs,
      })
    } catch (e) {
      lastErr = e
      if (!(e instanceof MondayTransientError) || attempt === maxAttempts) {
        throw e
      }
      const waitMs =
        e.retryAfterMs !== null
          ? e.retryAfterMs
          : jitter(BASE_BACKOFF_MS * 2 ** (attempt - 1))
      console.warn(
        JSON.stringify({
          event: "monday_graphql.retry",
          attempt,
          max_attempts: maxAttempts,
          wait_ms: waitMs,
          error: e.message,
        })
      )
      await sleep(waitMs)
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("Monday API failed without a recorded error.")
}
