// Regression tests for the cross-tenant daily-brief leak.
//
// Before the fix, two layers conspired to expose tasks from every tenant
// to every signed-in user:
//   1. The cron-generated "global" brief stored top-priority tasks/leads
//      (id, title, tenant_id, due_date, priority) aggregated across all
//      tenants in a single byred_daily_briefs row with user_id = NULL.
//   2. The SELECT RLS policy granted authenticated users visibility into
//      rows where user_id IS NULL.
//
// Tests:
//   - The latest migration in supabase/migrations/ tightens SELECT to the
//     row owner only (no `user_id IS NULL` branch).
//   - getDailyBriefForSession() never reads a row where user_id IS NULL,
//     so even if the cron continues to write the global telemetry row,
//     it does not flow back to the user's screen.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations")

// Returns the union of all daily-brief-related migration SQL files with
// their // line comments stripped. We assert end-state correctness across
// the whole chain rather than pinning on whichever filename happens to be
// "latest", because the chain is split across multiple migrations (the
// initial owner-only policy file plus a follow-up cleanup that drops the
// legacy permissive policies discovered in production). Comments are
// stripped so explanatory prose like "SELECT USING (user_id IS NULL)..."
// inside a comment doesn't trip the regex.
function dailyBriefMigrationSql(): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .filter(
      (f) =>
        /daily_briefs/.test(f) ||
        /daily-briefs/.test(f) ||
        /briefs/.test(f)
    )
    .sort()
  expect(files.length).toBeGreaterThan(0)
  return files
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf-8"))
    .map((sql) => sql.replace(/^\s*--.*$/gm, ""))
    .join("\n\n")
}

describe("byred_daily_briefs RLS — global rows are not selectable", () => {
  it("no surviving SELECT policy includes a 'user_id IS NULL' branch", () => {
    const sql = dailyBriefMigrationSql()

    // Split the union on `;` (basic but adequate — these migrations have no
    // dollar-quoted bodies that would contain a literal semicolon). Then walk
    // each statement in chain order. For every policy name, remember whether
    // its last operation was a CREATE (with the body, if it's a SELECT
    // policy) or a DROP. A policy is "surviving" only if the latest op was a
    // CREATE — handles the defensive `DROP IF EXISTS x; CREATE x;` pattern
    // and the case where a later migration drops a previously-created one.
    type Survivor = { name: string; body: string }
    const lastOp = new Map<string, "create" | "drop">()
    const lastBody = new Map<string, string>()

    const statements = sql.split(/;\s*\n/).map((s) => s.trim())
    for (const stmt of statements) {
      if (!stmt) continue

      const dropMatch = stmt.match(
        /^DROP\s+POLICY\s+IF\s+EXISTS\s+([a-zA-Z_][a-zA-Z0-9_]*)/i
      )
      if (dropMatch) {
        lastOp.set(dropMatch[1].toLowerCase(), "drop")
        continue
      }

      const createMatch = stmt.match(
        /^CREATE\s+POLICY\s+([a-zA-Z_][a-zA-Z0-9_]*)[\s\S]+?FOR\s+(SELECT|INSERT|UPDATE|DELETE|ALL)/i
      )
      if (createMatch) {
        const name = createMatch[1].toLowerCase()
        const cmd = createMatch[2].toUpperCase()
        lastOp.set(name, "create")
        // Only retain bodies for SELECT policies — those are what we audit.
        if (cmd === "SELECT" || cmd === "ALL") {
          lastBody.set(name, stmt)
        } else {
          lastBody.delete(name)
        }
      }
    }

    const survivors: Survivor[] = []
    for (const [name, op] of lastOp.entries()) {
      if (op === "create" && lastBody.has(name)) {
        survivors.push({ name, body: lastBody.get(name)! })
      }
    }

    expect(
      survivors.length,
      "expected at least one surviving SELECT/ALL policy on byred_daily_briefs"
    ).toBeGreaterThan(0)

    for (const policy of survivors) {
      expect(policy.body, `policy ${policy.name}`).not.toMatch(
        /user_id\s+IS\s+NULL/i
      )
      expect(policy.body, `policy ${policy.name}`).toMatch(
        /byred_current_user_id/i
      )
    }
  })

  it("every legacy permissive daily-brief policy is dropped somewhere in the chain", () => {
    const sql = dailyBriefMigrationSql()
    const mustDrop = [
      "byred_daily_briefs_select_own_or_global",
      "briefs_read_global_or_own",
      "briefs_admin_manage",
    ]
    for (const name of mustDrop) {
      const re = new RegExp(`DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+${name}\\b`, "i")
      expect(sql, `expected a DROP POLICY for ${name}`).toMatch(re)
    }
  })
})

describe("getDailyBriefForSession — never falls back to the global brief", () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://test.local"
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key"
  })

  afterEach(() => {
    vi.resetModules()
  })

  it("queries only the row keyed by the current profile id and never .is('user_id', null)", async () => {
    const filterCalls: Array<{ method: string; args: unknown[] }> = []

    function makeBuilder() {
      const api: Record<string, unknown> = {
        select(_cols: string) {
          filterCalls.push({ method: "select", args: [_cols] })
          return api
        },
        eq(col: string, val: unknown) {
          filterCalls.push({ method: "eq", args: [col, val] })
          return api
        },
        is(col: string, val: unknown) {
          filterCalls.push({ method: "is", args: [col, val] })
          return api
        },
        maybeSingle: async () => ({ data: null, error: null }),
      }
      return api
    }

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        from: () => makeBuilder(),
      }),
    }))
    vi.doMock("@/lib/data/tenant-scope", () => ({
      requireTenantScope: async () => ({
        profileId: "profile-123",
        tenantIds: ["tenant-a"],
      }),
    }))

    const { getDailyBriefForSession } = await import("@/lib/data/daily-briefs")
    const result = await getDailyBriefForSession()

    // Default placeholder is returned when no per-user brief exists.
    expect(result.summary.headline).toMatch(/no brief generated/i)

    // Never queries user_id IS NULL — that was the leak surface.
    const isCalls = filterCalls.filter((c) => c.method === "is")
    for (const call of isCalls) {
      expect(call.args[0]).not.toBe("user_id")
    }

    // Always scopes by the caller's profile id when one exists.
    const userIdEq = filterCalls.find(
      (c) => c.method === "eq" && c.args[0] === "user_id"
    )
    expect(userIdEq).toBeTruthy()
    expect(userIdEq!.args[1]).toBe("profile-123")
  })

  it("returns the placeholder when the caller has no profile", async () => {
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => ({
        from: () => {
          throw new Error(
            "supabase should not be queried when profileId is null"
          )
        },
      }),
    }))
    vi.doMock("@/lib/data/tenant-scope", () => ({
      requireTenantScope: async () => ({
        profileId: null,
        tenantIds: [],
      }),
    }))

    const { getDailyBriefForSession } = await import("@/lib/data/daily-briefs")
    const result = await getDailyBriefForSession()
    expect(result.summary.headline).toMatch(/no brief generated/i)
  })
})
