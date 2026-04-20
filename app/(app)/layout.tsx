import { AppSidebar } from '@/components/byred/sidebar'
import { AppTopbar } from '@/components/byred/topbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-950">
      <AppSidebar />
      <div className="flex-1 flex flex-col ml-60">
        <AppTopbar />
        <main className="flex-1 pt-14 px-8 py-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
