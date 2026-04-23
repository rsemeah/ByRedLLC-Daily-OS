import "server-only"

import { mondayGraphql } from "@/lib/monday/graphql"

type ItemsResult = {
  items: Array<{ id: string; name: string }> | null
}

export type MondayBoardItem = { id: string; name: string }

type BoardItemsPageResult = {
  boards:
    | Array<{
        items_page: {
          cursor: string | null
          items: MondayBoardItem[]
        }
      }>
    | null
}

type BoardNextPageResult = {
  next_items_page: {
    cursor: string | null
    items: MondayBoardItem[]
  }
}

/**
 * Returns item id → name for the given Monday pulse/item ids (chunked).
 */
export async function fetchMondayItemNamesByIds(
  ids: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const unique = [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))]
  const chunkSize = 100

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const data = await mondayGraphql<ItemsResult>({
      query: `
        query ItemsByIds($ids: [ID!]) {
          items(ids: $ids) {
            id
            name
          }
        }
      `,
      variables: { ids: chunk },
    })

    for (const row of data.items ?? []) {
      map.set(String(row.id), row.name)
    }
  }

  return map
}

/**
 * Paginate through every item on a Monday board via items_page cursors.
 * Monday API v2 caps each page at 500. `pageLimit` guards against runaway loops
 * on abnormally large boards; raise it if a real board hits the ceiling.
 */
export async function fetchAllBoardItems(
  boardId: string,
  opts: { pageSize?: number; pageLimit?: number } = {}
): Promise<MondayBoardItem[]> {
  const pageSize = Math.min(Math.max(opts.pageSize ?? 200, 1), 500)
  const pageLimit = opts.pageLimit ?? 50

  const first = await mondayGraphql<BoardItemsPageResult>({
    query: `
      query BoardItems($ids: [ID!], $limit: Int!) {
        boards(ids: $ids) {
          items_page(limit: $limit) {
            cursor
            items { id name }
          }
        }
      }
    `,
    variables: { ids: [boardId], limit: pageSize },
  })

  const board = first.boards?.[0]
  if (!board) return []

  const collected: MondayBoardItem[] = [...(board.items_page.items ?? [])]
  let cursor = board.items_page.cursor
  let pages = 1

  while (cursor && pages < pageLimit) {
    const next = await mondayGraphql<BoardNextPageResult>({
      query: `
        query NextItems($cursor: String!, $limit: Int!) {
          next_items_page(cursor: $cursor, limit: $limit) {
            cursor
            items { id name }
          }
        }
      `,
      variables: { cursor, limit: pageSize },
    })
    collected.push(...(next.next_items_page.items ?? []))
    cursor = next.next_items_page.cursor
    pages += 1
  }

  return collected
}
