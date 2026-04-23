import Link from "next/link"
import { ExternalLink, LayoutGrid } from "lucide-react"
import { mondayBoardId, DEFAULT_MONDAY_BOARD_ID } from "@/lib/monday/board-id"
import { mondayApiTokenConfigured } from "@/lib/monday/integration"
import { fetchAllMondayBoards } from "@/lib/monday/fetch-boards"
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

export default async function MondayIntegrationPage() {
  const configured = mondayApiTokenConfigured()
  const syncBoardId = mondayBoardId()
  const boardIdFromEnv = Boolean(process.env.MONDAY_BOARD_ID?.trim())

  let boards: Awaited<ReturnType<typeof fetchAllMondayBoards>> = []
  let fetchError: string | null = null

  if (configured) {
    try {
      boards = await fetchAllMondayBoards()
    } catch (e) {
      fetchError =
        e instanceof Error ? e.message : "Could not load boards from Monday."
    }
  }

  const sorted = [...boards].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  )

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
            All boards visible to your API token, plus the{" "}
            <strong className="font-medium text-zinc-700">default sync board</strong>{" "}
            used when pushing tasks from By Red (
            <code className="text-xs font-mono bg-zinc-100 px-1 rounded">
              MONDAY_BOARD_ID
            </code>{" "}
            or built-in fallback).
          </p>
        </div>
      </div>

      <Card className="border-zinc-200 bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-zinc-900">
            Task sync target
          </CardTitle>
          <CardDescription className="text-zinc-500">
            New Monday items created from tasks always use this board (and{" "}
            <code className="text-xs font-mono">MONDAY_GROUP_ID</code> when set).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <code className="text-sm font-mono bg-zinc-100 px-2 py-1 rounded border border-zinc-200">
              {syncBoardId}
            </code>
            {!boardIdFromEnv && (
              <span className="text-xs px-2 py-0.5 rounded-sm bg-amber-50 text-amber-800 border border-amber-200">
                Built-in default ({DEFAULT_MONDAY_BOARD_ID})
              </span>
            )}
            {boardIdFromEnv && (
              <span className="text-xs px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-200">
                From{" "}
                <code className="font-mono">MONDAY_BOARD_ID</code>
              </span>
            )}
          </div>
          {!configured && (
            <p className="text-sm text-zinc-500">
              Set <code className="text-xs font-mono">MONDAY_API_KEY</code> (or{" "}
              <code className="text-xs font-mono">MONDAY_TOKEN</code>) in the server
              environment so push/pull and this list can run.
            </p>
          )}
        </CardContent>
      </Card>

      {!configured ? (
        <Card className="border-zinc-200 bg-zinc-50/80">
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-sm text-zinc-600">
              Monday API credentials are not configured on this deployment.
            </p>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Add <code className="font-mono">MONDAY_API_KEY</code> to{" "}
              <code className="font-mono">.env.local</code> or hosting env vars, redeploy,
              then reload this page to load boards.
            </p>
          </CardContent>
        </Card>
      ) : fetchError ? (
        <Card className="border-byred-red/30 bg-red-50/50">
          <CardContent className="py-6">
            <p className="text-sm font-medium text-zinc-800">
              Could not fetch boards
            </p>
            <p className="text-xs text-red-700 mt-2 font-mono whitespace-pre-wrap">
              {fetchError}
            </p>
            <p className="text-xs text-zinc-500 mt-4">
              If your <code className="font-mono">MONDAY_BOARD_ID</code> points at a
              board the token cannot access, push sync may still fail even though other
              boards appear here—align the env ID with one of your workspaces below.
            </p>
          </CardContent>
        </Card>
      ) : sorted.length === 0 ? (
        <Card className="border-zinc-200">
          <CardContent className="py-8 text-center text-sm text-zinc-500">
            No boards returned. Check token scopes or workspace membership.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-zinc-200 bg-white shadow-sm overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-semibold text-zinc-900">
              All boards ({sorted.length})
            </CardTitle>
            <CardDescription>
              Rows highlighted in red match your current default sync board ID.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="rounded-md border border-zinc-200 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-zinc-600">Board</TableHead>
                    <TableHead className="text-zinc-600 w-[140px]">ID</TableHead>
                    <TableHead className="text-zinc-600">Workspace</TableHead>
                    <TableHead className="text-zinc-600 w-[90px]">State</TableHead>
                    <TableHead className="text-zinc-600 w-[100px] text-right">
                      Open
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((b) => {
                    const isSyncTarget = String(b.id) === String(syncBoardId)
                    return (
                      <TableRow
                        key={b.id}
                        className={
                          isSyncTarget
                            ? "bg-byred-red/[0.06] border-l-2 border-l-byred-red"
                            : ""
                        }
                      >
                        <TableCell className="font-medium text-zinc-800">
                          <span className="flex items-center gap-2">
                            {b.name}
                            {isSyncTarget && (
                              <span className="text-[10px] uppercase tracking-wide font-semibold text-byred-red border border-byred-red/30 rounded px-1.5 py-0">
                                Sync target
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
                          <Button variant="ghost" size="sm" className="h-8 gap-1" asChild>
                            <a
                              href={`https://monday.com/boards/${b.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Monday
                              <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
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
        Pull sync for linked tasks uses item IDs only; titles must still exist in
        Monday. If env board ID drifted from the plan, fix{" "}
        <code className="font-mono">MONDAY_BOARD_ID</code> and redeploy — see{" "}
        <Link href="/settings" className="text-byred-red hover:underline">
          Settings
        </Link>
        .
      </p>
    </div>
  )
}
