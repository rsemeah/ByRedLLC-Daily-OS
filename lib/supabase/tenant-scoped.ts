import type { Database } from "@/types/database"
import { createClient } from "@/lib/supabase/server"

type TableName = Extract<keyof Database["public"]["Tables"], string>
type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>

type TenantScopedClient = Omit<ServerSupabaseClient, "from"> & {
  from: (table: TableName) => unknown
}

type EqCapable = {
  eq: (column: string, value: string) => unknown
}

type InsertCapable = {
  insert: (values: unknown, options?: unknown) => unknown
}

type UpsertCapable = {
  upsert: (values: unknown, options?: unknown) => unknown
}

type SelectCapable = {
  select: (columns?: string) => unknown
}

type UpdateCapable = {
  update: (values: unknown) => unknown
}

type DeleteCapable = {
  delete: () => unknown
}

function withTenantFilter(builder: unknown, tenantId: string): unknown {
  if (typeof builder !== "object" || builder === null) {
    return builder
  }

  const maybeEq = builder as Partial<EqCapable>
  if (typeof maybeEq.eq !== "function") {
    return builder
  }

  return maybeEq.eq("tenant_id", tenantId)
}

function normalizeTenantValues(values: unknown, tenantId: string): unknown {
  if (Array.isArray(values)) {
    return values.map((value) => normalizeTenantValues(value, tenantId))
  }

  if (typeof values !== "object" || values === null) {
    return values
  }

  const record = values as Record<string, unknown>
  const existingTenantId = record.tenant_id

  if (typeof existingTenantId === "string" && existingTenantId !== tenantId) {
    throw new Error("Tenant mismatch in mutation payload")
  }

  return {
    ...record,
    tenant_id: tenantId,
  }
}

async function validateTenantMembership(
  client: ServerSupabaseClient,
  userId: string,
  tenantId: string
): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser()

  if (userError) {
    throw new Error(`Failed to resolve authenticated user: ${userError.message}`)
  }

  if (!user || user.id !== userId) {
    throw new Error("Authenticated user does not match requested tenant scope")
  }

  const { data: membership, error: membershipError } = await client
    .from("byred_user_tenants")
    .select("id")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle()

  if (membershipError) {
    throw new Error(`Failed to verify tenant membership: ${membershipError.message}`)
  }

  if (!membership) {
    throw new Error("User is not a member of the requested tenant")
  }
}

export async function getTenantScopedClient(
  userId: string,
  tenantId: string
): Promise<TenantScopedClient> {
  const baseClient = await createClient()
  await validateTenantMembership(baseClient, userId, tenantId)

  const proxiedClient = new Proxy(baseClient, {
    get(target, property, receiver) {
      if (property !== "from") {
        return Reflect.get(target, property, receiver)
      }

      return (table: TableName) => {
        const tableClient = target.from(table)

        return new Proxy(tableClient, {
          get(tableTarget, tableProperty, tableReceiver) {
            const original = Reflect.get(tableTarget, tableProperty, tableReceiver)

            if (typeof original !== "function") {
              return original
            }

            if (tableProperty === "select") {
              return (columns?: string) => {
                const selectable = tableTarget as SelectCapable
                const builder = selectable.select(columns)
                return withTenantFilter(builder, tenantId)
              }
            }

            if (tableProperty === "update") {
              return (values: unknown) => {
                const updatable = tableTarget as UpdateCapable
                const builder = updatable.update(values)
                return withTenantFilter(builder, tenantId)
              }
            }

            if (tableProperty === "delete") {
              return () => {
                const deletable = tableTarget as DeleteCapable
                const builder = deletable.delete()
                return withTenantFilter(builder, tenantId)
              }
            }

            if (tableProperty === "insert") {
              return (values: unknown, options?: unknown) => {
                const insertable = tableTarget as InsertCapable
                return insertable.insert(normalizeTenantValues(values, tenantId), options)
              }
            }

            if (tableProperty === "upsert") {
              return (values: unknown, options?: unknown) => {
                const upsertable = tableTarget as UpsertCapable
                return upsertable.upsert(normalizeTenantValues(values, tenantId), options)
              }
            }

            return original
          },
        })
      }
    },
  })

  return proxiedClient as TenantScopedClient
}
