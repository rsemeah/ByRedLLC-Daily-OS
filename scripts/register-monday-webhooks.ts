/**
 * Register Monday.com webhooks on every bound tenant board so the app receives
 * instant-sync events (item create/update/delete/archive/rename). Idempotent:
 * lists existing webhooks for each board and skips any (board, event) pair
 * that is already wired. Pass --force to purge and re-create.
 *
 * Usage:
 *   pnpm tsx --env-file=.env.local scripts/register-monday-webhooks.ts \
 *     --url https://byred.app/api/webhooks/monday [--force]
 *
 * Env fallback: MONDAY_PUBLIC_WEBHOOK_URL. Must be HTTPS and publicly reachable.
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// Minimal .env.local loader (tsx --env-file sometimes not available locally).
const envPath = resolve(process.cwd(), ".env.local")
try {
  const raw = readFileSync(envPath, "utf8")
  for (const line of raw.split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq < 0) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (!process.env[k]) process.env[k] = v
  }
} catch {}

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const MONDAY_TOKEN =
  process.env.MONDAY_API_KEY?.trim() || process.env.MONDAY_TOKEN?.trim()

if (!SB_URL || !SB_KEY) throw new Error("Missing Supabase env vars")
if (!MONDAY_TOKEN) throw new Error("Missing MONDAY_API_KEY / MONDAY_TOKEN")

const args = process.argv.slice(2)
function arg(name: string): string | null {
  const i = args.indexOf(`--${name}`)
  if (i >= 0 && args[i + 1]) return args[i + 1]
  return null
}
const force = args.includes("--force")
const WEBHOOK_URL =
  arg("url") || process.env.MONDAY_PUBLIC_WEBHOOK_URL?.trim() || null

if (!WEBHOOK_URL) {
  console.error(
    "Need a public webhook URL. Pass --url https://<host>/api/webhooks/monday or set MONDAY_PUBLIC_WEBHOOK_URL in .env.local."
  )
  process.exit(1)
}
if (!/^https:\/\//.test(WEBHOOK_URL)) {
  console.error(`Webhook URL must be HTTPS (got "${WEBHOOK_URL}")`)
  process.exit(1)
}

const admin = createClient(SB_URL, SB_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Events we need for a complete sync signal. Creation, mutation, deletion,
// archival, and rename cover every upstream change class our pull-sync
// reconciles. `change_column_value` is the catch-all for status/priority/date.
const EVENTS = [
  "create_item",
  "change_column_value",
  "change_name",
  "item_deleted",
  "item_archived",
  "item_restored",
] as const
type EventType = (typeof EVENTS)[number]

type MondayResponse<T> = { data?: T; errors?: Array<{ message: string }> }

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

// Monday's complexity budget recharges over time. When a single mutation
// returns "Complexity budget exhausted," the fix is to wait and retry.
// We retry up to 3 times with exponential backoff, capped at ~30s total.
async function monday<T>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) await sleep(2000 * 2 ** (attempt - 1))
    const res = await fetch("https://api.monday.com/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: MONDAY_TOKEN! },
      body: JSON.stringify({ query, variables }),
    })
    const body = (await res.json()) as MondayResponse<T>
    if (body.errors?.length) {
      const msg = body.errors.map((e) => e.message).join("; ")
      if (/complexity/i.test(msg)) {
        lastErr = new Error(msg)
        continue
      }
      throw new Error(msg)
    }
    if (!body.data) throw new Error("Monday returned no data")
    return body.data
  }
  throw lastErr instanceof Error ? lastErr : new Error("Monday API failed")
}

type ExistingWebhook = { id: string; event: string; board_id: string; config: string | null }

async function listWebhooks(boardId: string): Promise<ExistingWebhook[]> {
  const data = await monday<{ webhooks: ExistingWebhook[] | null }>(
    `query ($board_id: ID!) { webhooks(board_id: $board_id) { id event board_id config } }`,
    { board_id: boardId }
  )
  return data.webhooks ?? []
}

async function deleteWebhook(id: string): Promise<void> {
  await monday(
    `mutation ($id: ID!) { delete_webhook(id: $id) { id } }`,
    { id }
  )
}

async function createWebhook(
  boardId: string,
  event: EventType,
  url: string
): Promise<string> {
  const data = await monday<{ create_webhook: { id: string } | null }>(
    `mutation ($board_id: ID!, $url: String!, $event: WebhookEventType!) {
       create_webhook(board_id: $board_id, url: $url, event: $event) { id board_id }
     }`,
    { board_id: boardId, url, event }
  )
  if (!data.create_webhook?.id) throw new Error("create_webhook returned no id")
  return data.create_webhook.id
}

type TenantRow = { id: string; name: string; monday_board_id: string | null; active: boolean | null }

async function main() {
  console.log(`\n=== Register Monday webhooks ===`)
  console.log(`  target URL: ${WEBHOOK_URL}`)
  console.log(`  force     : ${force}`)
  console.log(`  events    : ${EVENTS.join(", ")}\n`)

  const { data, error } = await admin
    .from("byred_tenants")
    .select("id, name, monday_board_id, active")
    .not("monday_board_id", "is", null)
    .eq("active", true)
  if (error) throw new Error(error.message)

  const bindings = (data ?? []) as TenantRow[]
  if (bindings.length === 0) {
    console.log("No bound tenants. Nothing to register.")
    return
  }

  let totalCreated = 0
  let totalSkipped = 0
  let totalDeleted = 0
  let totalErrored = 0

  for (const t of bindings) {
    const boardId = t.monday_board_id!
    console.log(`\n[${t.name}] board=${boardId}`)

    let existing: ExistingWebhook[] = []
    try {
      existing = await listWebhooks(boardId)
    } catch (e) {
      console.error(`  ✗ listWebhooks failed: ${e instanceof Error ? e.message : String(e)}`)
      totalErrored += 1
      continue
    }
    console.log(`  existing webhooks on this board: ${existing.length}`)

    if (force && existing.length > 0) {
      for (const w of existing) {
        try {
          await deleteWebhook(w.id)
          totalDeleted += 1
          console.log(`  🗑  deleted webhook id=${w.id} event=${w.event}`)
        } catch (e) {
          totalErrored += 1
          console.error(`  ✗ delete ${w.id}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
      existing = []
    }

    const existingEvents = new Set(existing.map((w) => w.event))

    for (const ev of EVENTS) {
      if (existingEvents.has(ev)) {
        totalSkipped += 1
        console.log(`  · already registered: ${ev}`)
        continue
      }
      try {
        const id = await createWebhook(boardId, ev, WEBHOOK_URL!)
        totalCreated += 1
        console.log(`  ✓ created ${ev} → id=${id}`)
      } catch (e) {
        totalErrored += 1
        console.error(`  ✗ create ${ev}: ${e instanceof Error ? e.message : String(e)}`)
      }
      // Pace mutations so we don't burn Monday's complexity budget mid-loop.
      await sleep(400)
    }
  }

  console.log(
    `\n=== Summary ===\n  created=${totalCreated}  skipped=${totalSkipped}  deleted=${totalDeleted}  errors=${totalErrored}\n`
  )
  if (totalErrored > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
