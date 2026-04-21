"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { ByredUser, ByredTenant, ByredUserTenant } from "@/types/database"
import type { User } from "@supabase/supabase-js"

export type CurrentUser = {
  // Supabase auth user
  authUser: User
  // byred_users profile (may be null if not yet created)
  profile: ByredUser | null
  // Tenants the user has access to
  tenants: Array<ByredTenant & { role: ByredUserTenant["role"] }>
  // Is the user an admin?
  isAdmin: boolean
}

const UserContext = createContext<CurrentUser | null>(null)

export function UserProvider({
  children,
  user,
}: {
  children: ReactNode
  user: CurrentUser | null
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}

export function useRequiredUser() {
  const user = useUser()
  if (!user) {
    throw new Error("User is required but not found in context")
  }
  return user
}
