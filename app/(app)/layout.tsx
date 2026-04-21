import { AppSidebar } from "@/components/byred/sidebar"
import { AppTopbar } from "@/components/byred/topbar"
import { UserProvider } from "@/lib/context/user-context"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  // If no authenticated user, redirect to login
  if (!user) {
    redirect("/login")
  }

  return (
    <UserProvider user={user}>
      <div className="flex min-h-screen bg-zinc-950">
        <AppSidebar />
        <div className="flex-1 flex flex-col ml-60">
          <AppTopbar />
          <main className="flex-1 pt-14 px-8 py-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </UserProvider>
  )
}
