import "server-only"

import { logger } from "@/lib/observability/logger"

export type AlertSeverity = "info" | "warn" | "error"

export type AlertPayload = {
  event: string
  severity: AlertSeverity
  message: string
  context?: Record<string, unknown>
}

/**
 * Fire a best-effort alert to the configured webhook URL (Slack, Discord,
 * or any service that accepts `{ "text": "…" }`). Never throws — alerting
 * failures must not fail the caller. A missing `BYRED_ALERT_WEBHOOK_URL`
 * just writes to the structured log and returns.
 */
export async function sendAlert(alert: AlertPayload): Promise<void> {
  const url = process.env.BYRED_ALERT_WEBHOOK_URL?.trim()

  if (!url) {
    logger.info("alert.skipped_no_webhook", {
      event: alert.event,
      severity: alert.severity,
      message: alert.message,
      context: alert.context,
    })
    return
  }

  const icon =
    alert.severity === "error" ? "🔴" : alert.severity === "warn" ? "🟡" : "🔵"
  const text =
    `${icon} *${alert.event}* — ${alert.message}\n` +
    (alert.context
      ? "```" + JSON.stringify(alert.context, null, 2) + "```"
      : "")

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5_000)
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) {
      logger.warn("alert.webhook_http_error", {
        event: alert.event,
        status: res.status,
      })
    }
  } catch (e) {
    logger.warn(
      "alert.webhook_send_failed",
      { event: alert.event },
      e
    )
  }
}
