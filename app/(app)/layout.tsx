import { AppSidebar } from "@/components/byred/sidebar"
import { AppTopbar } from "@/components/byred/topbar"
import { UserProvider } from "@/lib/context/user-context"
import { SidebarProvider } from "@/lib/context/sidebar-context"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppLayoutClient } from "./layout-client"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const result = await getCurrentUser()

  // If no authenticated user, redirect to login
  if (!result) {
    redirect("/login")
  }

  const { user, directory } = result

  return (
    <UserProvider user={user} directory={directory}>
      <SidebarProvider>
        <div className="flex min-h-screen bg-background">
          <AppSidebar />
          <AppLayoutClient>
            <AppTopbar />
            <main className="flex-1 pt-14 px-4 md:px-8 py-6 overflow-y-auto">
              {children}
            </main>
          </AppLayoutClient>
        </div>
      </SidebarProvider>
    </UserProvider>
  )
}
