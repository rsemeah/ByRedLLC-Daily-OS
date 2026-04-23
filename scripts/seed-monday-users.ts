// Pull the Monday workspace users into byred_users.
// Idempotent — safe to re-run. Matches first by monday_user_id, then by
// lower(email), else inserts a `source='monday_import'` roster row.

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

try {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
  for (const line of raw.split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq < 0) continue
    let v = t.slice(eq + 1).trim()
    if ((v[0] === '"' && v.slice(-1) === '"') || (v[0] === "'" && v.slice(-1) === "'"))
      v = v.slice(1, -1)
    if (!process.env[t.slice(0, eq).trim()]) process.env[t.slice(0, eq).trim()] = v
  }
} catch {}

async function main() {
  const { syncMondayUsersToByred } = await import("../lib/monday/users")
  const result = await syncMondayUsersToByred()
  console.log(JSON.stringify(result, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
