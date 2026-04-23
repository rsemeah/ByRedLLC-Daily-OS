import "server-only"

import { mondayGraphql } from "@/lib/monday/graphql"

export type MondayBoardSummary = {
  id: string
  name: string
  state?: string | null
  workspace?: { id: string; name: string } | null
}

/**
 * Every board the configured API token can see (paginated server-side).
 */
export async function fetchAllMondayBoards(): Promise<MondayBoardSummary[]> {
  const limit = 100
  let page = 1
  const all: MondayBoardSummary[] = []

  for (;;) {
    type BoardsQuery = {
      boards: MondayBoardSummary[] | null
    }

    const data = await mondayGraphql<BoardsQuery>({
      query: `
        query BoardsPage($limit: Int!, $page: Int!) {
          boards(limit: $limit, page: $page) {
            id
            name
            state
            workspace {
              id
              name
            }
          }
        }
      `,
      variables: { limit, page },
    })

    const batch = data.boards ?? []
    if (batch.length === 0) break

    all.push(...batch)

    if (batch.length < limit) break
    page++
  }

  return all
}
