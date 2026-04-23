import Link from "next/link"
import { ExternalLink, LayoutGrid, CheckCircle2, AlertCircle } from "lucide-react"
import { getBoundTenantBoardsForCurrentUser } from "@/lib/monday/board-id"
import { mondayApiTokenConfigured } from "@/lib/monday/integration"
import { fetchAllMondayBoards } from "@/lib/monday/fetch-boards"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const dynamic = "force-dynamic"

type TenantRow = {
  id: string
  name: string
  active: boolean | null
  monday_board_id: string | null
  monday_group_id: string | null
}

async function listTenantsForCurrentUser(): Promise<TenantRow[]> {
  // RLS-scoped read. `byred_tenants` policies limit rows to tenants the
  // current user is a member of, so this page never leaks other tenants'
  // board bindings.
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("byred_tenants")
    .select("id, name, active, monday_board_id, monday_group_id")
    .order("name", { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as TenantRow[]
}

export default async function MondayIntegrationPage() {
  const configured = mondayApiTokenConfigured()

  // Resolve the active tenant from user metadata so switching in the sidebar
  // immediately filters this page to the selected board.
  const supabaseAuth = await createClient()
  const { data: { user: authUser } } = await supabaseAuth.auth.getUser()
  const activeTenantId =
    typeof authUser?.user_metadata?.active_tenant_id === "string"
      ? authUser.user_metadata.active_tenant_id
      : null

  let boards: Awaited<ReturnType<typeof fetchAllMondayBoards>> = []
  let boardsFetchError: string | null = null
  if (configured) {
    try {
      boards = await fetchAllMondayBoards()
    } catch (e) {
      boardsFetchError =
        e instanceof Error ? e.message : "Could not load boards from Monday."
    }
  }

  const boardsById = new Map(boards.map((b) => [String(b.id), b]))

  let tenants: TenantRow[] = []
  let tenantsError: string | null = null
  try {
    tenants = await listTenantsForCurrentUser()
  } catch (e) {
    tenantsError = e instanceof Error ? e.message : "Could not load tenants."
  }

  const bound = tenants.filter((t) => t.monday_board_id?.trim())
  const unbound = tenants.filter((t) => !t.monday_board_id?.trim())
  const bindings = await getBoundTenantBoardsForCurrentUser({
    activeOnly: false,
  }).catch(() => [])

  // Filter to active tenant if one is selected
  const activeTenant = activeTenantId ? tenants.find((t) => t.id === activeTenantId) : null
  const displayTenants = activeTenant ? [activeTenant] : tenants

  // Detect orphan bindings: tenant points at a board_id that's not visible to
  // the current Monday token (wrong workspace, archived, token scope, etc.).
  const orphanBindings = bindings.filter(
    (b) => configured && !boardsFetchError && !boardsById.has(b.boardId)
  )

  const sortedBoards = [...boards].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  )
  const boundBoardIds = new Set(bound.map((t) => t.monday_board_id!))

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-start gap-3">
        <div className="mt-1 rounded-md border border-zinc-200 bg-white p-2">
          <LayoutGrid className="h-5 w-5 text-byred-red" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-3xl font-condensed font-bold text-zinc-900 tracking-tight">
            Monday.com
          </h1>
          <p className="mt-1 text-sm text-zinc-500 max-w-2xl">
            Every tenant binds to exactly one Monday board. Push, pull, and
            webhook routing all resolve the board from the tenant row. Legacy{" "}
            <code className="text-xs font-mono bg-zinc-100 px-1 rounded">
              MONDAY_BOARD_ID
            </code>{" "}
            is a fallback only.
          </p>
        </div>
      </div>

      {!configured && (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="py-4">
            <p className="text-sm text-amber-800">
              Monday API credentials are not configured on this deployment. Set{" "}
              <code className="font-mono text-xs">MONDAY_API_KEY</code> (or{" "}
              <code className="font-mono text-xs">MONDAY_TOKEN</code>) to enable
              board fetch, push, and pull sync.
            </p>
          </CardContent>
        </Card>
      )}

      {boardsFetchError && (
        <Card className="border-byred-red/30 bg-red-50/50">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-zinc-800">
              Could not fetch boards from Monday
            </p>
            <p className="text-xs text-red-700 mt-2 font-mono whitespace-pre-wrap">
              {boardsFetchError}
            </p>
          </CardContent>
        </Card>
      )}

      {orphanBindings.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/70">
          <CardContent className="py-4 space-y-2">
            <p className="text-sm font-medium text-amber-900">
              {orphanBindings.length} tenant{orphanBindings.length === 1 ? "" : "s"}{" "}
              bound to a board ID your token cannot see.
            </p>
            <ul className="text-xs text-amber-800 font-mono space-y-0.5">
              {orphanBindings.map((o) => (
                <li key={o.tenantId}>
                  {o.tenantName} → {o.boardId}
                </li>
              ))}
            </ul>
            <p className="text-xs text-amber-700">
              Check the Monday workspace membership or re-map to a visible board.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-zinc-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-zinc-900">
                {activeTenant
                  ? `${activeTenant.name}`
                  : `Tenant bindings (${bound.length} bound, ${unbound.length} unbound)`}
              </CardTitle>
              <CardDescription className="text-zinc-500">
                {activeTenant
                  ? "Showing board for the selected tenant. Switch tenants in the sidebar."
                  : "One tenant → one Monday board. Select a tenant in the sidebar to focus."}
              </CardDescription>
            </div>
            {activeTenant && (
              <span className="text-[10px] uppercase tracking-wide font-semibold text-byred-red border border-byred-red/30 rounded px-2 py-0.5">
                Active
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {tenantsError ? (
            <p className="text-xs text-red-700 font-mono">{tenantsError}</p>
          ) : displayTenants.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-6">
              No tenants found.
            </p>
          ) : (
            <div className="rounded-md border border-zinc-200 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-zinc-600">Tenant</TableHead>
                    <TableHead className="text-zinc-600 w-[180px]">
                      Board ID
                    </TableHead>
                    <TableHead className="text-zinc-600">Monday board</TableHead>
                    <TableHead className="text-zinc-600 w-[80px]">
                      Status
                    </TableHead>
                    <TableHead className="text-zinc-600 w-[100px] text-right">
                      Open
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayTenants.map((t) => {
                    const boardId = t.monday_board_id?.trim() || null
                    const board = boardId ? boardsById.get(boardId) : null
                    const isOrphan =
                      boardId !== null &&
                      configured &&
                      !boardsFetchError &&
                      !board
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-zinc-800">
                          {t.name}
                          {t.active === false && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-zinc-400">
                              inactive
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-zinc-600">
                          {boardId ?? (
                            <span className="text-zinc-400 italic">none</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-zinc-600">
                          {board?.name ?? (
                            <span className="text-zinc-400 italic">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {boardId === null ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                              <AlertCircle
                                className="h-3 w-3"
                                strokeWidth={1.75}
                              />
                              unbound
                            </span>
                          ) : isOrphan ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
                              <AlertCircle
                                className="h-3 w-3"
                                strokeWidth={1.75}
                              />
                              orphan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
                              <CheckCircle2
                                className="h-3 w-3"
                                strokeWidth={1.75}
                              />
                              bound
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {boardId ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1"
                              asChild
                            >
                              <a
                                href={`https://monday.com/boards/${boardId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Monday
                                <ExternalLink
                                  className="h-3 w-3"
                                  strokeWidth={1.75}
                                />
                              </a>
                            </Button>
                          ) : (
                            <span className="text-xs text-zinc-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {configured && !boardsFetchError && sortedBoards.length > 0 && !activeTenant && (
        <Card className="border-zinc-200 bg-white shadow-sm overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-semibold text-zinc-900">
              All boards visible to this token ({sortedBoards.length})
            </CardTitle>
            <CardDescription>
              Rows in red are already bound to a tenant.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="rounded-md border border-zinc-200 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-zinc-600">Board</TableHead>
                    <TableHead className="text-zinc-600 w-[140px]">
                      ID
                    </TableHead>
                    <TableHead className="text-zinc-600">Workspace</TableHead>
                    <TableHead className="text-zinc-600 w-[90px]">
                      State
                    </TableHead>
                    <TableHead className="text-zinc-600 w-[100px] text-right">
                      Open
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBoards.map((b) => {
                    const isBound = boundBoardIds.has(String(b.id))
                    return (
                      <TableRow
                        key={b.id}
                        className={
                          isBound
                            ? "bg-byred-red/[0.06] border-l-2 border-l-byred-red"
                            : ""
                        }
                      >
                        <TableCell className="font-medium text-zinc-800">
                          <span className="flex items-center gap-2">
                            {b.name}
                            {isBound && (
                              <span className="text-[10px] uppercase tracking-wide font-semibold text-byred-red border border-byred-red/30 rounded px-1.5 py-0">
                                Bound
                              </span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-zinc-600">
                          {b.id}
                        </TableCell>
                        <TableCell className="text-sm text-zinc-600">
                          {b.workspace?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-zinc-500 capitalize">
                          {b.state ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1"
                            asChild
                          >
                            <a
                              href={`https://monday.com/boards/${b.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Monday
                              <ExternalLink
                                className="h-3 w-3"
                                strokeWidth={1.75}
                              />
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-zinc-400">
        To rebind a tenant: update{" "}
        <code className="font-mono">byred_tenants.monday_board_id</code> in
        Supabase, then reload. Editable UI ships next. See{" "}
        <Link href="/settings" className="text-byred-red hover:underline">
          Settings
        </Link>
        .
      </p>
    </div>
  )
}
