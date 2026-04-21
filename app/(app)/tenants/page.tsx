import Link from "next/link"
import { formatDistanceToNow, parseISO } from "date-fns"
import { ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getTenantsWithStats } from "@/lib/data/tenants"
import { TENANT_COLORS } from "@/lib/tenant-colors"
import { cn } from "@/lib/utils"

export default async function TenantsPage() {
  const tenants = await getTenantsWithStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-condensed font-bold text-zinc-900 tracking-tight">
          Tenants
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {tenants.length} {tenants.length === 1 ? "tenant" : "tenants"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tenants.map((tenant) => {
          const colors = TENANT_COLORS[tenant.id] ?? {
            bg: "bg-zinc-100",
            text: "text-zinc-600",
            dot: "bg-zinc-400",
          }

          return (
            <Card
              key={tenant.id}
              className="bg-white border-zinc-200 shadow-sm"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2
                      className={cn(
                        "text-xl font-condensed font-bold",
                        colors.text
                      )}
                    >
                      {tenant.name}
                    </h2>
                    <span
                      className={cn(
                        "inline-block mt-1 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-sm",
                        colors.bg,
                        colors.text
                      )}
                    >
                      {tenant.type}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-md bg-zinc-50 border border-zinc-100">
                    <p className="text-lg font-condensed font-bold text-zinc-800">
                      {tenant.activeTasks}
                    </p>
                    <p className="text-[10px] text-zinc-400">Active tasks</p>
                  </div>
                  <div className="p-3 rounded-md bg-zinc-50 border border-zinc-100">
                    <p
                      className={cn(
                        "text-lg font-condensed font-bold",
                        tenant.overdueTasks > 0
                          ? "text-byred-red"
                          : "text-zinc-800"
                      )}
                    >
                      {tenant.overdueTasks}
                    </p>
                    <p className="text-[10px] text-zinc-400">Overdue tasks</p>
                  </div>
                  <div className="p-3 rounded-md bg-zinc-50 border border-zinc-100">
                    <p className="text-lg font-condensed font-bold text-zinc-800">
                      {tenant.openLeads}
                    </p>
                    <p className="text-[10px] text-zinc-400">Open leads</p>
                  </div>
                  <div className="p-3 rounded-md bg-zinc-50 border border-zinc-100">
                    <p className="text-xs font-mono text-zinc-500 leading-tight">
                      {tenant.lastActivityAt
                        ? formatDistanceToNow(parseISO(tenant.lastActivityAt), {
                            addSuffix: true,
                          })
                        : "No activity"}
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Last activity
                    </p>
                  </div>
                </div>

                <Button
                  asChild
                  variant="outline"
                  className="w-full border-zinc-300 text-zinc-600 hover:text-zinc-800 hover:bg-zinc-50 text-xs gap-2"
                >
                  <Link href={`/tasks?tenant_id=${tenant.id}`}>
                    <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
                    Open workspace
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}

        {tenants.length === 0 && (
          <p className="text-sm text-zinc-400 col-span-2">No tenants found.</p>
        )}
      </div>
    </div>
  )
}
