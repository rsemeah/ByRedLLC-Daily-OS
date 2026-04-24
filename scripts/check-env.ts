/**
 * Validates environment variables referenced by this repo.
 * Usage: `pnpm verify:env` (loads `.env.local` when present; never override existing shell env).
 */

import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local")
  if (!existsSync(envPath)) return

  const raw = readFileSync(envPath, "utf8")
  for (let line of raw.split("\n")) {
    line = line.replace(/\r$/, "")
    const t = line.trim()
    if (!t || t.startsWith("#")) continue

    const lineNoExport = t.startsWith("export ") ? t.slice(7).trimStart() : t
    const eq = lineNoExport.indexOf("=")
    if (eq <= 0) continue

    const key = lineNoExport.slice(0, eq).trim()
    let val = lineNoExport.slice(eq + 1).trim()

    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }

    if (process.env[key] === undefined) {
      process.env[key] = val
    }
  }
}

type Group = {
  title: string
  vars: Array<{ name: string; optional?: boolean }>
}

const GROUPS: Group[] = [
  {
    title: "Access control (required — internal OS allowlist)",
    vars: [{ name: "BYRED_INTERNAL_EMAILS" }],
  },
  {
    title: "Supabase (required for dev server + login)",
    vars: [
      { name: "NEXT_PUBLIC_SUPABASE_URL" },
      { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY" },
    ],
  },
  {
    title: "Supabase service role (seed, schema discovery, server admin)",
    vars: [{ name: "SUPABASE_SERVICE_ROLE_KEY", optional: true }],
  },
  {
    title: "Monday.com (boards UI, sync, webhooks)",
    vars: [
      { name: "MONDAY_API_KEY", optional: true },
      { name: "MONDAY_TOKEN", optional: true },
      { name: "MONDAY_BOARD_ID", optional: true },
      { name: "MONDAY_GROUP_ID", optional: true },
      { name: "MONDAY_WEBHOOK_SECRET", optional: true },
    ],
  },
  {
    title: "Groq AI",
    vars: [{ name: "GROQ_API_KEY", optional: true }],
  },
  {
    title: "Protected API routes",
    vars: [{ name: "CRON_SECRET", optional: true }],
  },
  {
    title: "pnpm seed:users",
    vars: [
      { name: "BYRED_KP_EMAIL", optional: true },
      { name: "BYRED_RORY_EMAIL", optional: true },
    ],
  },
  {
    title: "Transactional email (password reset, invites)",
    vars: [
      { name: "RESEND_API_KEY", optional: true },
      { name: "RESEND_FROM_EMAIL", optional: true },
      { name: "GMAIL_USER", optional: true },
      { name: "GMAIL_APP_PASSWORD", optional: true },
      { name: "GMAIL_FROM", optional: true },
      { name: "NEXT_PUBLIC_APP_URL", optional: true },
    ],
  },
]

function defined(name: string): boolean {
  const v = process.env[name]?.trim()
  return Boolean(v)
}

function main(): void {
  const envPath = resolve(process.cwd(), ".env.local")
  if (!existsSync(envPath)) {
    console.warn(
      "No .env.local file — copy .env.example to .env.local and fill values.\n"
    )
  }

  loadEnvLocal()

  const missingRequired: string[] = []

  for (const group of GROUPS) {
    console.log(`\n${group.title}`)
    for (const { name, optional } of group.vars) {
      const ok = defined(name)
      const label = ok ? "ok" : optional ? "—" : "MISSING"
      console.log(`  [${label}] ${name}`)
      if (!ok && !optional) missingRequired.push(name)
    }
  }

  const mondayToken =
    defined("MONDAY_API_KEY") || defined("MONDAY_TOKEN")

  console.log("\n--- Summary ---")
  if (missingRequired.length > 0) {
    console.error(
      `Required variables missing: ${missingRequired.join(", ")}`
    )
    console.error("Copy .env.example to .env.local and fill values.")
    process.exit(1)
  }

  console.log("Required Supabase vars are set.")

  if (!defined("SUPABASE_SERVICE_ROLE_KEY")) {
    console.log(
      "Note: SUPABASE_SERVICE_ROLE_KEY unset — seed:users / discover-schema will fail until set."
    )
  }

  if (!mondayToken) {
    console.log(
      "Note: No MONDAY_API_KEY / MONDAY_TOKEN — Monday boards page and sync will stay disabled."
    )
  }

  if (!defined("GROQ_API_KEY")) {
    console.log("Note: GROQ_API_KEY unset — AI task actions / brief generation disabled.")
  }

  process.exit(0)
}

main()
