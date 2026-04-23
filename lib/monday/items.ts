import "server-only"

import { mondayGraphql } from "@/lib/monday/graphql"
import { resolveBoardColumnMap } from "@/lib/monday/column-mapping"

type RawColumnValue = {
  id: string
  type: string | null
  text: string | null
  value: string | null
}

type RawBoardItem = {
  id: string
  name: string
  updated_at: string | null
  column_values: RawColumnValue[] | null
}

type ItemsWithBoardResult = {
  items:
    | Array<{
        id: string
        name: string
        board: { id: string } | null
      }>
    | null
}

export type MondayAssignee = {
  mondayUserId: string
  email: string | null
  name: string | null
}

export type MondayBoardItem = {
  id: string
  name: string
  updatedAt: string | null
  status: string | null
  dueDate: string | null
  priorityLabel: string | null
  assignees: MondayAssignee[]
}

export type MondayItemWithBoard = {
  id: string
  name: string
  boardId: string | null
}

type BoardItemsPageResult = {
  boards:
    | Array<{
        items_page: {
          cursor: string | null
          items: RawBoardItem[]
        }
      }>
    | null
}

type BoardNextPageResult = {
  next_items_page: {
    cursor: string | null
    items: RawBoardItem[]
  }
}

const ITEMS_PAGE_FRAGMENT = `
  id
  name
  updated_at
  column_values {
    id
    type
    text
    value
  }
`

/**
 * Extract a normalized view of the Monday item.
 *
 * With a `columnMap`, columns are resolved by id (deterministic per board).
 * Without one, we fall back to heuristics: first status-typed column that
 * isn't a priority, first date column, first column whose id/type looks
 * like priority. Assignees always come from `people`-typed columns.
 */
function normalizeItem(
  raw: RawBoardItem,
  columnMap?: {
    statusId: string | null
    priorityId: string | null
    dueDateId: string | null
    timelineId: string | null
    peopleId: string | null
  }
): MondayBoardItem {
  const cols = raw.column_values ?? []

  let status: string | null = null
  let dueDate: string | null = null
  let priority: string | null = null
  const assignees: MondayAssignee[] = []

  const matchesId = (c: RawColumnValue, id: string | null | undefined) =>
    id !== null && id !== undefined && c.id === id

  for (const c of cols) {
    const type = (c.type ?? "").toLowerCase()
    const id = (c.id ?? "").toLowerCase()
    const text = c.text?.trim() || null

    // Status — explicit id wins, else first non-priority status-typed column.
    if (columnMap?.statusId) {
      if (!status && matchesId(c, columnMap.statusId)) status = text
    } else if (!status && (type === "status" || type === "color")) {
      if (!id.includes("priority")) status = text
    }

    // Priority — explicit id wins, else id/type heuristic.
    if (columnMap?.priorityId) {
      if (!priority && matchesId(c, columnMap.priorityId)) priority = text
    } else if (!priority) {
      if (id.includes("priority") || id === "prio" || type === "priority") {
        priority = text
      }
    }

    // Due date — explicit, then timeline.from, then first date-typed column.
    if (columnMap?.dueDateId) {
      if (!dueDate && matchesId(c, columnMap.dueDateId) && text) {
        dueDate = text.slice(0, 10)
      }
    } else if (!dueDate && type === "date" && text) {
      dueDate = text.slice(0, 10)
    }
    if (
      !dueDate &&
      ((columnMap?.timelineId && matchesId(c, columnMap.timelineId)) ||
        (!columnMap?.timelineId && (type === "timeline" || type === "timerange")))
    ) {
      try {
        const parsed = c.value ? (JSON.parse(c.value) as { from?: string }) : null
        if (parsed?.from) dueDate = String(parsed.from).slice(0, 10)
      } catch {
        // Malformed timeline payloads are rare; swallow.
      }
    }

    // People — bound by either the explicit column id or any people-typed
    // column if no mapping is available.
    const isPeopleCol = columnMap?.peopleId
      ? matchesId(c, columnMap.peopleId)
      : type === "people" || type === "multiple-person"

    if (isPeopleCol && c.value) {
      try {
        const parsed = JSON.parse(c.value) as {
          personsAndTeams?: Array<{ id: number | string; kind?: string }>
        }
        for (const p of parsed.personsAndTeams ?? []) {
          if (p.kind && p.kind !== "person") continue
          assignees.push({
            mondayUserId: String(p.id),
            email: null,
            name: null,
          })
        }
      } catch {
        // Ignore malformed payloads.
      }
    }
  }

  return {
    id: String(raw.id),
    name: raw.name,
    updatedAt: raw.updated_at ?? null,
    status,
    dueDate,
    priorityLabel: priority,
    assignees,
  }
}

/**
 * Returns id → (name, boardId) for the given Monday item ids. Used by the
 * webhook to route items to the correct tenant when the event payload omits
 * `boardId`.
 */
export async function fetchMondayItemsWithBoardByIds(
  ids: string[]
): Promise<Map<string, MondayItemWithBoard>> {
  const map = new Map<string, MondayItemWithBoard>()
  const unique = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))]
  const chunkSize = 100

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const data = await mondayGraphql<ItemsWithBoardResult>({
      query: `
        query ItemsWithBoard($ids: [ID!]) {
          items(ids: $ids) {
            id
            name
            board { id }
          }
        }
      `,
      variables: { ids: chunk },
    })

    for (const row of data.items ?? []) {
      map.set(String(row.id), {
        id: String(row.id),
        name: row.name,
        boardId: row.board?.id ? String(row.board.id) : null,
      })
    }
  }

  return map
}

/**
 * Paginate through every item on a Monday board via items_page cursors.
 * Each page carries the normalized column view used by the pull sync.
 *
 * `pageLimit` guards against runaway pagination; raise it if a real board
 * legitimately exceeds 10,000 items (500 × 20 default pages) — and verify
 * Monday complexity budget when you do.
 */
export async function fetchAllBoardItems(
  boardId: string,
  opts: { pageSize?: number; pageLimit?: number; updatedAfter?: string } = {}
): Promise<MondayBoardItem[]> {
  const pageSize = Math.min(Math.max(opts.pageSize ?? 200, 1), 500)
  const pageLimit = opts.pageLimit ?? 50

  // Resolve board-specific column ids so column_values are matched by id
  // (deterministic) instead of by type heuristics.
  const map = await resolveBoardColumnMap(boardId)
  const columnMap = {
    statusId: map.status?.id ?? null,
    priorityId: map.priority?.id ?? null,
    dueDateId: map.dueDate?.id ?? null,
    timelineId: map.timeline?.id ?? null,
    peopleId: map.people?.id ?? null,
  }

  const first = await mondayGraphql<BoardItemsPageResult>({
    query: `
      query BoardItems($ids: [ID!], $limit: Int!) {
        boards(ids: $ids) {
          items_page(limit: $limit) {
            cursor
            items {
              ${ITEMS_PAGE_FRAGMENT}
            }
          }
        }
      }
    `,
    variables: { ids: [boardId], limit: pageSize },
  })

  const board = first.boards?.[0]
  if (!board) return []

  const collected: MondayBoardItem[] = (board.items_page.items ?? []).map((raw) =>
    normalizeItem(raw, columnMap)
  )
  let cursor = board.items_page.cursor
  let pages = 1

  while (cursor && pages < pageLimit) {
    const next = await mondayGraphql<BoardNextPageResult>({
      query: `
        query NextItems($cursor: String!, $limit: Int!) {
          next_items_page(cursor: $cursor, limit: $limit) {
            cursor
            items {
              ${ITEMS_PAGE_FRAGMENT}
            }
          }
        }
      `,
      variables: { cursor, limit: pageSize },
    })
    collected.push(
      ...(next.next_items_page.items ?? []).map((raw) => normalizeItem(raw, columnMap))
    )
    cursor = next.next_items_page.cursor
    pages += 1
  }

  // Monday's items_page does not support a "filter by updated_at > X" rule
  // with a typed variable (the `rules` API is only for board column
  // predicates). We always fetch the full board; callers wanting delta
  // behavior filter client-side on the returned updatedAt. Cost: same
  // Monday read quota; benefit: far fewer DB writes + less audit noise.
  if (opts.updatedAfter) {
    const cutoffMs = Date.parse(opts.updatedAfter)
    if (Number.isNaN(cutoffMs)) return collected
    // Strictly-greater. String compare fails across timezone-suffix forms
    // ("…Z" vs "…+00:00"), so parse to ms. Null updated_at is dropped on
    // delta runs — next full sync picks them up anyway.
    return collected.filter((i) => {
      if (!i.updatedAt) return false
      const itemMs = Date.parse(i.updatedAt)
      return !Number.isNaN(itemMs) && itemMs > cutoffMs
    })
  }

  return collected
}
