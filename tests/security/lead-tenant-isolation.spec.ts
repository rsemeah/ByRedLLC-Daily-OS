// Regression tests for tenant isolation on the lead action surface.
//
// Targets two confirmed gaps the audit closed:
//   1. Phantom-update: actions that take (leadId, tenantId) used to silently
//      no-op when the leadId belonged to a different tenant. They now must
//      return ok:false with a "not found" error.
//   2. Phantom-note: log/create-task actions used to insert an audit row
//      referencing a foreign-tenant leadId. They now must verify the lead
//      exists in the caller's tenant before any insert fires.
//
// Tests build a hand-rolled supabase fake so they run as fast unit tests
// without spinning up a database. The fake refuses to return cross-tenant
// rows on filtered selects/updates, mirroring RLS behavior.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

beforeEach(() => {
  vi.resetModules()
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://test.local"
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key"
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test-key"
})

afterEach(() => {
  vi.resetModules()
})

const TENANT_A = "00000000-0000-0000-0000-00000000aaaa"
const TENANT_B = "00000000-0000-0000-0000-00000000bbbb"
const ACTOR_PROFILE = "11111111-1111-1111-1111-111111111111"
const LEAD_IN_A = "22222222-2222-2222-2222-22222222aaaa"
const LEAD_IN_B = "33333333-3333-3333-3333-33333333bbbb"

type Captured = {
  selects: Array<{ table: string; filters: Record<string, unknown> }>
  updates: Array<{
    table: string
    patch: Record<string, unknown>
    filters: Record<string, unknown>
  }>
  inserts: Array<{ table: string; row: Record<string, unknown> }>
}

/**
 * Minimal supabase mock with two leads (one in each tenant). Every chained
 * call records the filter. .maybeSingle() looks up against the seed data
 * and returns null when no row matches all of (id, tenant_id).
 */
function makeFakeSupabase(captured: Captured) {
  const seed: Record<
    string,
    Array<{ id: string; tenant_id: string; name: string }>
  > = {
    byred_leads: [
      { id: LEAD_IN_A, tenant_id: TENANT_A, name: "Acme Corp" },
      { id: LEAD_IN_B, tenant_id: TENANT_B, name: "Other Tenant Co" },
    ],
    byred_tasks: [],
    byred_activities: [],
  }

  function builder(table: string) {
    const filters: Record<string, unknown> = {}
    let mode: "select" | "update" | "insert" | null = null
    let pendingPatch: Record<string, unknown> | null = null
    let pendingInsert: Record<string, unknown> | null = null

    const api: Record<string, unknown> = {
      select(_cols: string) {
        if (mode === null) mode = "select"
        return api
      },
      eq(col: string, val: unknown) {
        filters[col] = val
        return api
      },
      maybeSingle: async () => {
        if (mode === "select") {
          captured.selects.push({ table, filters: { ...filters } })
          const rows = seed[table] ?? []
          const hit = rows.find((r) =>
            Object.entries(filters).every(
              ([k, v]) => (r as Record<string, unknown>)[k] === v
            )
          )
          return { data: hit ?? null, error: null }
        }
        if (mode === "update") {
          captured.updates.push({
            table,
            patch: pendingPatch ?? {},
            filters: { ...filters },
          })
          const rows = seed[table] ?? []
          const hit = rows.find((r) =>
            Object.entries(filters).every(
              ([k, v]) => (r as Record<string, unknown>)[k] === v
            )
          )
          return { data: hit ? { id: hit.id } : null, error: null }
        }
        return { data: null, error: null }
      },
      single: async () => {
        if (mode === "insert") {
          const row = pendingInsert ?? {}
          captured.inserts.push({ table, row })
          const id = `gen-${captured.inserts.length}`
          if (table === "byred_tasks") {
            // Tasks would fail RLS in real Postgres if tenant_id mismatched,
            // but here we just hand back a stable id so action code keeps
            // flowing — the assertion that matters is what got *captured*.
          }
          return { data: { id }, error: null }
        }
        return { data: null, error: null }
      },
      update(patch: Record<string, unknown>) {
        mode = "update"
        pendingPatch = patch
        return api
      },
      insert(row: Record<string, unknown>) {
        mode = "insert"
        pendingInsert = row
        captured.inserts.push({ table, row })
        return api
      },
    }
    return api
  }

  return {
    from(table: string) {
      return builder(table)
    },
  }
}

function mockTenantAccess(allowedTenantId: string) {
  vi.doMock("@/lib/actions/tenant-guard", () => ({
    requireTenantAccess: vi.fn(async (tenantId: string) => {
      if (tenantId !== allowedTenantId) {
        throw new Error("You do not have access to this workspace.")
      }
      return { profileId: ACTOR_PROFILE }
    }),
    assertTenantApiAccess: vi.fn(),
  }))
}

function mockServerClient(captured: Captured) {
  const fake = makeFakeSupabase(captured)
  vi.doMock("@/lib/supabase/server", () => ({
    createClient: async () => fake,
  }))
}

describe("lead actions: cross-tenant ID is rejected", () => {
  it("logLeadContactNoteAction does not write an activity row when the lead is in another tenant", async () => {
    const captured: Captured = { selects: [], updates: [], inserts: [] }
    mockTenantAccess(TENANT_A)
    mockServerClient(captured)

    const { logLeadContactNoteAction } = await import("@/lib/actions/leads")
    const res = await logLeadContactNoteAction({
      leadId: LEAD_IN_B,
      tenantId: TENANT_A,
      note: "spam",
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toMatch(/not found/i)
    }
    // Critical: zero activity inserts. Pre-fix we recorded a phantom
    // audit row in tenant A pointing at lead-in-tenant-B.
    expect(
      captured.inserts.filter((i) => i.table === "byred_activities")
    ).toHaveLength(0)
  })

  it("logLeadContactNoteAction succeeds when the lead is in the actor's tenant", async () => {
    const captured: Captured = { selects: [], updates: [], inserts: [] }
    mockTenantAccess(TENANT_A)
    mockServerClient(captured)

    const { logLeadContactNoteAction } = await import("@/lib/actions/leads")
    const res = await logLeadContactNoteAction({
      leadId: LEAD_IN_A,
      tenantId: TENANT_A,
      note: "Called and left voicemail.",
    })

    expect(res.ok).toBe(true)
    const activityInserts = captured.inserts.filter(
      (i) => i.table === "byred_activities"
    )
    expect(activityInserts).toHaveLength(1)
    expect(activityInserts[0].row.tenant_id).toBe(TENANT_A)
    expect(activityInserts[0].row.object_id).toBe(LEAD_IN_A)
  })

  it("createTaskFromLeadAction refuses to spawn a task from a foreign-tenant lead", async () => {
    const captured: Captured = { selects: [], updates: [], inserts: [] }
    mockTenantAccess(TENANT_A)
    mockServerClient(captured)

    const { createTaskFromLeadAction } = await import("@/lib/actions/leads")
    const res = await createTaskFromLeadAction({
      leadId: LEAD_IN_B,
      tenantId: TENANT_A,
      leadName: "Spoofed",
    })

    expect(res.ok).toBe(false)
    expect(
      captured.inserts.filter((i) => i.table === "byred_tasks")
    ).toHaveLength(0)
    expect(
      captured.inserts.filter((i) => i.table === "byred_activities")
    ).toHaveLength(0)
  })

  it("markLeadContactedAction returns an error and writes nothing when the lead is in another tenant", async () => {
    const captured: Captured = { selects: [], updates: [], inserts: [] }
    mockTenantAccess(TENANT_A)
    mockServerClient(captured)

    const { markLeadContactedAction } = await import("@/lib/actions/leads")
    const res = await markLeadContactedAction({
      leadId: LEAD_IN_B,
      tenantId: TENANT_A,
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toMatch(/not found/i)
    }
    // The UPDATE was sent (with tenant filter) but matched zero rows; that's
    // fine — what matters is the action surfaces the no-op as an error
    // instead of falsely reporting success.
    const matchingUpdates = captured.updates.filter(
      (u) =>
        u.table === "byred_leads" &&
        u.filters.id === LEAD_IN_B &&
        u.filters.tenant_id === TENANT_A
    )
    expect(matchingUpdates).toHaveLength(1)
  })

  it("setLeadFollowUpAction returns an error for a foreign-tenant lead", async () => {
    const captured: Captured = { selects: [], updates: [], inserts: [] }
    mockTenantAccess(TENANT_A)
    mockServerClient(captured)

    const { setLeadFollowUpAction } = await import("@/lib/actions/leads")
    const res = await setLeadFollowUpAction({
      leadId: LEAD_IN_B,
      tenantId: TENANT_A,
      followUpAtIso: "2026-05-01T12:00:00Z",
    })

    expect(res.ok).toBe(false)
  })

  it("updateLeadStageAction returns an error and never logs a stage_change activity for a foreign-tenant lead", async () => {
    const captured: Captured = { selects: [], updates: [], inserts: [] }
    mockTenantAccess(TENANT_A)
    mockServerClient(captured)

    const { updateLeadStageAction } = await import("@/lib/actions/leads")
    const res = await updateLeadStageAction({
      leadId: LEAD_IN_B,
      tenantId: TENANT_A,
      stage: "WON",
      previousStage: "NEW",
    })

    expect(res.ok).toBe(false)
    expect(
      captured.inserts.filter((i) => i.table === "byred_activities")
    ).toHaveLength(0)
  })

  it("requireTenantAccess rejects callers who do not belong to the supplied tenant", async () => {
    const captured: Captured = { selects: [], updates: [], inserts: [] }
    mockTenantAccess(TENANT_A) // actor is in A only
    mockServerClient(captured)

    const { logLeadContactNoteAction } = await import("@/lib/actions/leads")
    const res = await logLeadContactNoteAction({
      leadId: LEAD_IN_B,
      tenantId: TENANT_B, // attacker tries to act under B
      note: "any",
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toMatch(/access/i)
    }
    // No DB work happened at all — the guard fires before the supabase client
    // is even built.
    expect(captured.selects).toHaveLength(0)
    expect(captured.inserts).toHaveLength(0)
    expect(captured.updates).toHaveLength(0)
  })
})
