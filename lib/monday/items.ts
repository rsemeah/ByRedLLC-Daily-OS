import "server-only"

import { mondayGraphql } from "@/lib/monday/graphql"

type ItemsResult = {
  items: Array<{ id: string; name: string }> | null
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
