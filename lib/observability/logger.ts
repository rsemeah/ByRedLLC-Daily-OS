import "server-only"

type LogLevel = "debug" | "info" | "warn" | "error"

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

function currentMinLevel(): LogLevel {
  const env = (process.env.BYRED_LOG_LEVEL ?? "info").toLowerCase() as LogLevel
  return LEVELS[env] ? env : "info"
}

const MIN = LEVELS[currentMinLevel()]

export type LogContext = Record<string, unknown>

export type Logger = {
  debug: (event: string, ctx?: LogContext) => void
  info: (event: string, ctx?: LogContext) => void
  warn: (event: string, ctx?: LogContext, err?: unknown) => void
  error: (event: string, ctx?: LogContext, err?: unknown) => void
  child: (ctx: LogContext) => Logger
}

function describeError(err: unknown): LogContext | undefined {
  if (err === undefined) return undefined
  if (err instanceof Error) {
    return {
      err_name: err.name,
      err_message: err.message,
      err_stack: err.stack?.split("\n").slice(0, 8).join("\n"),
    }
  }
  return { err_raw: String(err) }
}

function emit(
  level: LogLevel,
  baseCtx: LogContext,
  event: string,
  ctx?: LogContext,
  err?: unknown
) {
  if (LEVELS[level] < MIN) return
  const line = {
    ts: new Date().toISOString(),
    level,
    event,
    ...baseCtx,
    ...(ctx ?? {}),
    ...describeError(err),
  }
  const out = JSON.stringify(line)
  if (level === "error") console.error(out)
  else if (level === "warn") console.warn(out)
  else console.info(out)
}

function make(baseCtx: LogContext): Logger {
  return {
    debug: (event, ctx) => emit("debug", baseCtx, event, ctx),
    info: (event, ctx) => emit("info", baseCtx, event, ctx),
    warn: (event, ctx, err) => emit("warn", baseCtx, event, ctx, err),
    error: (event, ctx, err) => emit("error", baseCtx, event, ctx, err),
    child: (ctx) => make({ ...baseCtx, ...ctx }),
  }
}

export const logger: Logger = make({ app: "byred_os" })

export function newRequestId(): string {
  return crypto.randomUUID()
}

export function correlationId(req?: Request | null): string {
  if (!req) return newRequestId()
  return (
    req.headers.get("x-vercel-id") ??
    req.headers.get("x-request-id") ??
    req.headers.get("cf-ray") ??
    newRequestId()
  )
}
