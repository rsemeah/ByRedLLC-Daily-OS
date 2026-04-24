import "server-only"

import nodemailer from "nodemailer"
import { logger } from "@/lib/observability/logger"
import { sendAlert } from "@/lib/observability/alerts"

export type SendMailInput = {
  to: string
  subject: string
  html: string
  text: string
}

export type SendMailResult = {
  delivered: boolean
  provider: "resend" | "gmail" | "log"
  id: string | null
}

type GmailTransport = ReturnType<typeof nodemailer.createTransport>
let gmailTransporter: GmailTransport | null = null

function getGmailTransport(): GmailTransport | null {
  const user = process.env.GMAIL_USER?.trim()
  const pass = process.env.GMAIL_APP_PASSWORD?.trim().replace(/\s+/g, "")
  if (!user || !pass) return null
  if (gmailTransporter) return gmailTransporter
  gmailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  })
  return gmailTransporter
}

async function sendViaResend(input: SendMailInput): Promise<SendMailResult> {
  const key = process.env.RESEND_API_KEY!.trim()
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "By Red <no-reply@byredllc.com>"

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    logger.error("mail.resend_failed", {
      to: input.to,
      status: res.status,
      body: body.slice(0, 400),
    })
    throw new Error(`Resend HTTP ${res.status}`)
  }

  const data = (await res.json().catch(() => null)) as { id?: string } | null
  logger.info("mail.sent", {
    provider: "resend",
    to: input.to,
    id: data?.id ?? null,
    subject: input.subject,
  })
  return { delivered: true, provider: "resend", id: data?.id ?? null }
}

async function sendViaGmail(
  transport: GmailTransport,
  input: SendMailInput
): Promise<SendMailResult> {
  const from =
    process.env.GMAIL_FROM?.trim() ||
    `By Red <${process.env.GMAIL_USER?.trim()}>`

  const info = await transport.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  })

  logger.info("mail.sent", {
    provider: "gmail",
    to: input.to,
    id: info.messageId ?? null,
    subject: input.subject,
  })
  return { delivered: true, provider: "gmail", id: info.messageId ?? null }
}

/**
 * Send a transactional email. Transport priority:
 *   1. Resend  (if `RESEND_API_KEY` set)
 *   2. Gmail SMTP  (if `GMAIL_USER` + `GMAIL_APP_PASSWORD` set)
 *   3. Log + alert — body is written to the structured log and an alert
 *      fires so a missing transport is loud, never silent.
 *
 * Callers never handle transport selection; just pass the message.
 */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  if (process.env.RESEND_API_KEY?.trim()) {
    return sendViaResend(input)
  }

  const gmail = getGmailTransport()
  if (gmail) {
    return sendViaGmail(gmail, input)
  }

  logger.warn("mail.no_transport", {
    to: input.to,
    subject: input.subject,
    body_preview: input.text.slice(0, 400),
  })
  await sendAlert({
    event: "mail.no_transport",
    severity: "warn",
    message: `No email transport configured; mail to ${input.to} was not delivered. Body logged.`,
    context: { subject: input.subject },
  })
  return { delivered: false, provider: "log", id: null }
}
