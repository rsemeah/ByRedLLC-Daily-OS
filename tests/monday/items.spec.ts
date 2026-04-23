import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const originalFetch = globalThis.fetch

beforeEach(() => {
  vi.resetModules()
  process.env.MONDAY_API_KEY = "test-token"
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

function mondayResponse(items: Array<Record<string, unknown>>, cursor: string | null = null) {
  return new Response(
    JSON.stringify({
      data: {
        boards: [
          {
            items_page: {
              cursor,
              items,
            },
          },
        ],
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  )
}

describe("fetchAllBoardItems: column normalization", () => {
  it("extracts status from the first `status` column and due date from the first `date` column", async () => {
    globalThis.fetch = vi.fn(async () =>
      mondayResponse([
        {
          id: "1",
          name: "Task A",
          updated_at: "2026-04-20T10:00:00Z",
          column_values: [
            { id: "status", type: "status", text: "Working on it", value: null },
            { id: "date", type: "date", text: "2026-05-01", value: null },
          ],
        },
      ])
    ) as unknown as typeof fetch

    const { fetchAllBoardItems } = await import("@/lib/monday/items")
    const items = await fetchAllBoardItems("123")
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      id: "1",
      name: "Task A",
      status: "Working on it",
      dueDate: "2026-05-01",
    })
  })

  it("extracts due date from a `timeline` column's value.from field", async () => {
    globalThis.fetch = vi.fn(async () =>
      mondayResponse([
        {
          id: "2",
          name: "Task B",
          updated_at: null,
          column_values: [
            {
              id: "timeline",
              type: "timeline",
              text: null,
              value: JSON.stringify({ from: "2026-06-15", to: "2026-06-20" }),
            },
          ],
        },
      ])
    ) as unknown as typeof fetch

    const { fetchAllBoardItems } = await import("@/lib/monday/items")
    const items = await fetchAllBoardItems("456")
    expect(items[0].dueDate).toBe("2026-06-15")
  })
})

describe("fetchAllBoardItems: delta filter", () => {
  it("drops items at or before the cutoff, keeps strictly newer ones, regardless of timezone suffix", async () => {
    globalThis.fetch = vi.fn(async () =>
      mondayResponse([
        { id: "older", name: "old", updated_at: "2026-04-19T10:00:00Z", column_values: [] },
        { id: "equal", name: "equal", updated_at: "2026-04-20T10:00:00Z", column_values: [] },
        { id: "newer", name: "new", updated_at: "2026-04-21T10:00:00Z", column_values: [] },
        { id: "null_ts", name: "n/a", updated_at: null, column_values: [] },
      ])
    ) as unknown as typeof fetch

    const { fetchAllBoardItems } = await import("@/lib/monday/items")
    // Cutoff stored in Postgres form (no Z suffix, +00:00) — must compare as ms.
    const items = await fetchAllBoardItems("789", {
      updatedAfter: "2026-04-20T10:00:00+00:00",
    })
    expect(items.map((i) => i.id)).toEqual(["newer"])
  })

  it("returns everything when no cutoff is provided", async () => {
    globalThis.fetch = vi.fn(async () =>
      mondayResponse([
        { id: "a", name: "", updated_at: "2026-04-19T10:00:00Z", column_values: [] },
        { id: "b", name: "", updated_at: null, column_values: [] },
      ])
    ) as unknown as typeof fetch
    const { fetchAllBoardItems } = await import("@/lib/monday/items")
    const items = await fetchAllBoardItems("789")
    expect(items).toHaveLength(2)
  })
})
