"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import type { ByredUser, ByredTenant, ByredUserTenant } from "@/types/database"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

export type TenantAccess = ByredTenant & { role: ByredUserTenant["role"] }

export type TenantContextValue = {
  authUser: User
  profile: ByredUser | null
  tenants: TenantAccess[]
  activeTenantId: string | null
  setActiveTenantId: (tenantId: string) => Promise<void>
  isAdmin: boolean
}

export type CurrentUser = TenantContextValue

type TenantProviderProps = {
  children: ReactNode
  user: {
    authUser: User
    profile: ByredUser | null
    tenants: TenantAccess[]
    initialActiveTenantId: string | null
  }
}

const TenantContext = createContext<TenantContextValue | null>(null)

export function TenantProvider({ children, user }: TenantProviderProps) {
  const [activeTenantId, setActiveTenantIdState] = useState<string | null>(
    user.initialActiveTenantId
  )

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
    }
  }, [activeTenantId, user.authUser, user.profile, user.tenants])

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
