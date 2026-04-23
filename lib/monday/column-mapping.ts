import "server-only"

import { mondayGraphql } from "@/lib/monday/graphql"
import { logger } from "@/lib/observability/logger"

export type BoardColumn = {
  id: string
  title: string
  type: string
}

export type BoardColumnMap = {
  boardId: string
  status: BoardColumn | null
  priority: BoardColumn | null
  dueDate: BoardColumn | null
  timeline: BoardColumn | null
  people: BoardColumn | null
  all: BoardColumn[]
}

type BoardColumnsResp = {
  boards: Array<{ columns: BoardColumn[] }> | null
}

// Cache lives per server-process lifetime. Boards rarely change schema, so
// a 5-minute TTL is safe and spares us a GraphQL call on every sync tick.
const CACHE_TTL_MS = 5 * 60 * 1000

type CacheEntry = { at: number; map: BoardColumnMap }
const cache = new Map<string, CacheEntry>()

function pickByTitle(
  columns: BoardColumn[],
  preferredTypes: string[],
  titleMatches: Array<(t: string) => boolean>
): BoardColumn | null {
  const typed = columns.filter((c) => preferredTypes.includes(c.type))
  for (const matcher of titleMatches) {
    const hit = typed.find((c) => matcher(c.title.trim().toLowerCase()))
    if (hit) return hit
  }
  // Fallback: first of the preferred type.
  return typed[0] ?? null
}

/**
 * Resolve the four columns we care about on a given Monday board:
 *   status    — Monday status-typed column whose title is "Status"
 *   priority  — Monday status-typed column whose title contains "priority"
 *   dueDate   — `date` column titled "Due Date" → "Date" → first date
 *   people    — `people`/`multiple-person` column titled "Owner" → first
 *
 * Returns null for any role the board doesn't carry — callers skip that
 * field instead of writing null into the DB.
 */
export async function resolveBoardColumnMap(boardId: string): Promise<BoardColumnMap> {
  const cached = cache.get(boardId)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.map
  }

  const resp = await mondayGraphql<BoardColumnsResp>({
    query: `
      query ($ids: [ID!]) {
        boards(ids: $ids) {
          columns { id title type }
        }
      }
    `,
    variables: { ids: [boardId] },
  })

  const columns = resp.boards?.[0]?.columns ?? []

  const status = pickByTitle(
    columns,
    ["status", "color"],
    [
      (t) => t === "status",
      (t) => t.startsWith("status") && !t.includes("priority"),
      (t) => !t.includes("priority"),
    ]
  )

  const priority = pickByTitle(
    columns,
    ["status", "color", "priority"],
    [(t) => t === "priority", (t) => t.includes("priority")]
  )

  const dueDate = pickByTitle(
    columns,
    ["date"],
    [(t) => t === "due date", (t) => t.includes("due"), (t) => t === "date"]
  )

  const timeline = pickByTitle(columns, ["timeline", "timerange"], [(t) => t.includes("timeline")])

  const people = pickByTitle(
    columns,
    ["people", "multiple-person"],
    [(t) => t === "owner", (t) => t.startsWith("owner"), (t) => t.includes("owner")]
  )

  const map: BoardColumnMap = {
    boardId,
    status,
    priority,
    dueDate,
    timeline,
    people,
    all: columns,
  }

  cache.set(boardId, { at: Date.now(), map })
  logger.debug("column_mapping.resolved", {
    board_id: boardId,
    status_id: status?.id ?? null,
    priority_id: priority?.id ?? null,
    due_date_id: dueDate?.id ?? null,
    people_id: people?.id ?? null,
  })

  return map
}

export function invalidateBoardColumnCache(boardId?: string): void {
  if (boardId) cache.delete(boardId)
  else cache.clear()
}
