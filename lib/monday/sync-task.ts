import "server-only"

import { mondayBoardId } from "@/lib/monday/board-id"
import { mondayGraphql } from "@/lib/monday/graphql"

async function resolveGroupId(boardId: string): Promise<string> {
  const configured = process.env.MONDAY_GROUP_ID?.trim()
  if (configured) {
    return configured
  }

  type GroupsResult = {
    boards: Array<{
      groups: Array<{ id: string; title: string }>
    } | null>
  }

  const data = await mondayGraphql<GroupsResult>({
    query: `
      query BoardGroups($ids: [ID!]) {
        boards(ids: $ids) {
          groups {
            id
            title
          }
        }
      }
    `,
    variables: { ids: [boardId] },
  })

  const groups = data.boards?.[0]?.groups ?? []
  const first = groups[0]
  if (!first?.id) {
    throw new Error(
      "No groups on this Monday board. Add a group or set MONDAY_GROUP_ID."
    )
  }

  return first.id
}

/**
 * Creates a Monday item from a task title and returns the new item id (string).
 */
export async function createMondayItemForTask(taskTitle: string): Promise<string> {
  const boardId = mondayBoardId()
  const groupId = await resolveGroupId(boardId)
  const name = taskTitle.trim().slice(0, 255) || "Task"

  type CreateResult = {
    create_item: { id: string } | null
  }

  const data = await mondayGraphql<CreateResult>({
    query: `
      mutation CreateFromByRed($boardId: ID!, $groupId: String!, $itemName: String!) {
        create_item(
          board_id: $boardId,
          group_id: $groupId,
          item_name: $itemName
        ) {
          id
        }
      }
    `,
    variables: {
      boardId,
      groupId,
      itemName: name,
    },
  })

  const id = data.create_item?.id
  if (!id) {
    throw new Error("Monday did not return an item id.")
  }

  return String(id)
}
