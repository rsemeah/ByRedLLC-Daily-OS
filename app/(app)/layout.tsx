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
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <UserProvider user={user}>
      <SidebarProvider>
        <div className="flex min-h-screen bg-zinc-950">
          <AppSidebar />
          <AppLayoutClient>
            <AppTopbar />
            <main className="flex-1 pt-14 px-6 py-6 overflow-y-auto bg-zinc-950">
              {children}
            </main>
          </AppLayoutClient>
        </div>
      </SidebarProvider>
    </UserProvider>
  )
}
