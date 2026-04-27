import { describe, expect, it } from "vitest"
import { buildEventKey } from "@/lib/monday/webhook-dedup"

describe("buildEventKey", () => {
  it("prefers event.id when Monday provides one", () => {
    const k = buildEventKey({ event: { id: "evt_123" } })
    expect(k).toBe("event:evt_123")
  })

  it("falls back to the composite of pulse + column + type + updatedAt", () => {
    const k = buildEventKey({
      event: {
        pulseId: 11786742163,
        boardId: 18408502764,
        columnId: "status",
        type: "update_column_value",
        updatedAt: "2026-04-23T01:02:03Z",
      },
    })
    expect(k).toBe(
      "composite:b:18408502764|p:11786742163|c:status|t:update_column_value|u:2026-04-23T01:02:03Z"
    )
  })

  it("keeps otherwise-identical events from different boards distinct", () => {
    const base = {
      event: {
        pulseId: "42",
        columnId: "status",
        type: "update_column_value",
        updatedAt: "2026-04-23T09:00:00Z",
      },
    }

    expect(buildEventKey({ event: { ...base.event, boardId: "board-a" } })).not.toBe(
      buildEventKey({ event: { ...base.event, boardId: "board-b" } })
    )
  })

  it("returns the same composite key for the same event payload (idempotent key)", () => {
    const payload = {
      event: {
        pulseId: "42",
        columnId: "date",
        type: "update_column_value",
        updatedAt: "2026-04-23T09:00:00Z",
      },
    }
    expect(buildEventKey(payload)).toBe(buildEventKey(payload))
  })

  it("hashes the raw payload when no identifying fields are present", () => {
    const k1 = buildEventKey({ arbitrary: "payload", n: 1 })
    const k2 = buildEventKey({ arbitrary: "payload", n: 1 })
    const k3 = buildEventKey({ arbitrary: "payload", n: 2 })
    expect(k1).toMatch(/^hash:[a-f0-9]{64}$/)
    expect(k1).toBe(k2)
    expect(k1).not.toBe(k3)
  })
})
