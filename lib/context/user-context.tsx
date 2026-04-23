"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import type { ByredUser, ByredTenant, ByredUserTenant } from "@/types/database"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

export type TenantAccess = ByredTenant & { role: ByredUserTenant["role"] }

/**
 * Roster-level shape used for rendering owner avatars / names on tasks.
 * Intentionally smaller than a full `ByredUser` so the provider only ships
 * what's needed (name + avatar + email) to the client bundle.
 */
export type DirectoryUser = {
  id: string
  name: string
  email: string
  avatar_url: string | null
  role: string | null
}

export type TenantContextValue = {
  authUser: User
  profile: ByredUser | null
  tenants: TenantAccess[]
  activeTenantId: string | null
  setActiveTenantId: (tenantId: string) => Promise<void>
  isAdmin: boolean
  directory: DirectoryUser[]
  directoryById: Map<string, DirectoryUser>
}

export type CurrentUser = TenantContextValue

type TenantProviderProps = {
  children: ReactNode
  user: {
    authUser: User
    profile: ByredUser | null
    tenants: TenantAccess[]
    initialActiveTenantId: string | null
    directory?: DirectoryUser[]
  }
}

const TenantContext = createContext<TenantContextValue | null>(null)

export function TenantProvider({ children, user }: TenantProviderProps) {
  const [activeTenantId, setActiveTenantIdState] = useState<string | null>(
    user.initialActiveTenantId
  )

  const directoryById = useMemo(() => {
    const m = new Map<string, DirectoryUser>()
    for (const u of user.directory ?? []) m.set(u.id, u)
    return m
  }, [user.directory])

  const value = useMemo<TenantContextValue>(() => {
    const setActiveTenantId = async (tenantId: string) => {
      if (!user.tenants.some((tenant) => tenant.id === tenantId)) {
        throw new Error("Selected tenant is not available for this user")
      }

      setActiveTenantIdState(tenantId)

      try {
        const supabase = createClient()
        await supabase.auth.updateUser({
          data: {
            active_tenant_id: tenantId,
          },
        })
      } catch (error) {
        console.error("Failed to persist active tenant metadata", error)
      }
    }

    return {
      authUser: user.authUser,
      profile: user.profile,
      tenants: user.tenants,
      activeTenantId,
      setActiveTenantId,
      isAdmin: user.profile?.role === "admin",
      directory: user.directory ?? [],
      directoryById,
    }
  }, [
    activeTenantId,
    user.authUser,
    user.profile,
    user.tenants,
    user.directory,
    directoryById,
  ])

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function UserProvider({
  children,
  user,
}: {
  children: ReactNode
  user: {
    authUser: User
    profile: ByredUser | null
    tenants: TenantAccess[]
    initialActiveTenantId: string | null
    directory?: DirectoryUser[]
  }
}) {
  return <TenantProvider user={user}>{children}</TenantProvider>
}

export function useTenantContext() {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error("useTenantContext must be used within a TenantProvider")
  }

  return context
}

export function useUser() {
  return useTenantContext()
}

export function useRequiredUser() {
  const user = useUser()
  return user
}
