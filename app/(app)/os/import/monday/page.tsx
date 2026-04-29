"use client"

import { useState } from "react"
import {
  Upload,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Loader2,
} from "lucide-react"
import { MOCK_IMPORT_BATCHES } from "@/components/byred/os/mock-data"
import { cn } from "@/lib/utils"

const STATUS_ICONS = {
  completed: CheckCircle2,
  failed: XCircle,
  processing: Loader2,
  pending: Clock,
}

const STATUS_COLORS = {
  completed: "text-emerald-400",
  failed: "text-red-400",
  processing: "text-sky-400",
  pending: "text-amber-400",
}

export default function OSImportMondayPage() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)

  async function handleSync() {
    setIsSyncing(true)
    // POST /api/sync/monday — wired to real route
    try {
      const res = await fetch("/api/sync/monday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (res.ok) {
        setLastSynced(new Date().toLocaleTimeString())
      }
    } catch {
      // handled silently — user can retry
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-condensed tracking-tight">
            Monday.com Import
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Sync tasks from Monday.com boards into By Red OS
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            isSyncing
              ? "bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed"
              : "bg-[#D7261E] text-white hover:bg-[#B51E18]"
          )}
        >
          {isSyncing ? (
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
          ) : (
            <RefreshCw className="w-4 h-4" strokeWidth={2} />
          )}
          {isSyncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>

      {lastSynced && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-950/40 border border-emerald-800/40">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={2} />
          <span className="text-sm text-emerald-300">Sync completed at {lastSynced}</span>
        </div>
      )}

      {/* Status cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Last Batch", value: MOCK_IMPORT_BATCHES[0]?.total_rows ?? 0, suffix: "items" },
          { label: "Imported",   value: MOCK_IMPORT_BATCHES[0]?.imported_rows ?? 0, suffix: "success" },
          { label: "Failed",     value: MOCK_IMPORT_BATCHES[0]?.failed_rows ?? 0, suffix: "errors" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
            <p className="text-2xl font-bold text-white font-condensed">{stat.value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{stat.label}</p>
            <p className="text-[10px] text-zinc-700 mt-0.5">{stat.suffix}</p>
          </div>
        ))}
      </div>

      {/* Import batches */}
      <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800">
          <Upload className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
          <span className="text-sm font-medium text-white">Import History</span>
        </div>

        <div className="divide-y divide-zinc-800/60">
          {MOCK_IMPORT_BATCHES.map((batch) => {
            const Icon = STATUS_ICONS[batch.status] ?? Clock
            const colorClass = STATUS_COLORS[batch.status] ?? "text-zinc-400"
            const pct = batch.total_rows > 0
              ? Math.round((batch.imported_rows / batch.total_rows) * 100)
              : 0

            return (
              <div key={batch.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn("w-4 h-4 shrink-0", colorClass, batch.status === "processing" && "animate-spin")}
                      strokeWidth={1.75}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-200 capitalize">
                          {batch.source}
                        </span>
                        <span className={cn("text-[10px] font-medium capitalize", colorClass)}>
                          {batch.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        Started {new Date(batch.created_at).toLocaleString("en-US", {
                          month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono text-zinc-300">
                      {batch.imported_rows}/{batch.total_rows}
                    </p>
                    {batch.failed_rows > 0 && (
                      <p className="text-xs text-red-400 flex items-center gap-1 justify-end">
                        <AlertTriangle className="w-3 h-3" strokeWidth={2} />
                        {batch.failed_rows} failed
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        batch.status === "completed" ? "bg-emerald-500" :
                        batch.status === "failed" ? "bg-red-500" : "bg-sky-500"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Info footer */}
        <div className="px-5 py-3 bg-black/20 border-t border-zinc-800 flex items-center justify-between">
          <p className="text-xs text-zinc-600">
            Webhook at <span className="font-mono text-zinc-500">/api/webhooks/monday</span>
          </p>
          <a
            href="/api/sync/monday"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            target="_blank"
          >
            API endpoint <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
