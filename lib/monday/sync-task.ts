import "server-only"

import { boardIdForTenant, mondayBoardId } from "@/lib/monday/board-id"
import { mondayGraphql } from "@/lib/monday/graphql"
import { createAdminClient } from "@/lib/supabase/admin"

async function resolveGroupId(
  boardId: string,
  tenantGroupId: string | null
): Promise<string> {
  if (tenantGroupId) return tenantGroupId

  const envGroup = process.env.MONDAY_GROUP_ID?.trim()
  if (envGroup) return envGroup

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
      "No groups on this Monday board. Add a group, set monday_group_id on the tenant, or set MONDAY_GROUP_ID."
    )
  }

  return first.id
}

async function resolveTenantGroupId(tenantId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("byred_tenants")
    .select("monday_group_id")
    .eq("id", tenantId)
    .maybeSingle()
  const row = data as { monday_group_id: string | null } | null
  return row?.monday_group_id?.trim() || null
}

/**
 * Create a Monday item for a By Red task and return the new item id (string).
 * Resolves the target board from the task's tenant (`byred_tenants.monday_board_id`).
 * Falls back to legacy `MONDAY_BOARD_ID` env only if the tenant has no binding.
 */
export async function createMondayItemForTask(
  taskTitle: string,
  tenantId: string
): Promise<string> {
  const boundBoardId = await boardIdForTenant(tenantId)
  const boardId = boundBoardId ?? mondayBoardId()
  const tenantGroup = await resolveTenantGroupId(tenantId)
  const groupId = await resolveGroupId(boardId, tenantGroup)
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
