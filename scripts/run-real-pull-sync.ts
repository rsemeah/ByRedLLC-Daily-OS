// Exercises the real production path: lib/monday/pull-sync.ts
// Verifies advisory lock, composite unique upsert, retry wrapper all compose.

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
} catch {
  console.warn("Could not read .env.local — relying on existing env vars")
}

async function main() {
  const { pullAllMondayBoardsIntoTasks } = await import(
    "../lib/monday/pull-sync"
  )
  const batch = await pullAllMondayBoardsIntoTasks()
  console.log(JSON.stringify(batch, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
