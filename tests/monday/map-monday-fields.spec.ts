import { describe, expect, it } from "vitest"
import {
  mapMondayPriority,
  mapMondayStatus,
} from "@/lib/monday/map-monday-fields"

describe("mapMondayStatus", () => {
  it("returns null for null / empty / unknown labels", () => {
    expect(mapMondayStatus(null)).toBeNull()
    expect(mapMondayStatus("")).toBeNull()
    expect(mapMondayStatus("   ")).toBeNull()
    expect(mapMondayStatus("some random label")).toBeNull()
  })

  it("maps common Monday status labels to our enum", () => {
    expect(mapMondayStatus("Done")).toBe("done")
    expect(mapMondayStatus("Complete")).toBe("done")
    expect(mapMondayStatus("Working on it")).toBe("in_progress")
    expect(mapMondayStatus("In Progress")).toBe("in_progress")
    expect(mapMondayStatus("Stuck")).toBe("blocked")
    expect(mapMondayStatus("Blocked")).toBe("blocked")
    expect(mapMondayStatus("Overdue")).toBe("overdue")
    expect(mapMondayStatus("Not Started")).toBe("not_started")
    expect(mapMondayStatus("Backlog")).toBe("not_started")
    expect(mapMondayStatus("Cancelled")).toBe("cancelled")
  })

  it("is case and whitespace tolerant", () => {
    expect(mapMondayStatus("  DONE  ")).toBe("done")
    expect(mapMondayStatus("working on it")).toBe("in_progress")
    expect(mapMondayStatus("BLOCKED")).toBe("blocked")
  })
})

describe("mapMondayPriority", () => {
  it("maps priority labels to the bounded enum", () => {
    expect(mapMondayPriority("Critical")).toBe("critical")
    expect(mapMondayPriority("Urgent")).toBe("critical")
    expect(mapMondayPriority("p0")).toBe("critical")
    expect(mapMondayPriority("High")).toBe("high")
    expect(mapMondayPriority("Medium")).toBe("medium")
    expect(mapMondayPriority("Low")).toBe("low")
  })

  it("returns null for unknown labels so we never corrupt user data", () => {
    expect(mapMondayPriority(null)).toBeNull()
    expect(mapMondayPriority("")).toBeNull()
    expect(mapMondayPriority("whatever")).toBeNull()
  })
})
