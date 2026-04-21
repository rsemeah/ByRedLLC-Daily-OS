"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Plus, DollarSign, GripVertical } from "lucide-react"
import { toast } from "sonner"
import { isBefore, parseISO, isValid } from "date-fns"
import { Button } from "@/components/ui/button"
import { TenantPill } from "@/components/byred/tenant-pill"
import type { Lead } from "@/types/db"
import { cn } from "@/lib/utils"
import { useUser } from "@/lib/context/user-context"
import { syncActiveTenantForMutation } from "@/lib/client/sync-active-tenant"
import { updateLeadStageAction } from "@/lib/actions/leads"

const STAGES: { key: Lead["stage"]; label: string }[] = [
  { key: "NEW", label: "New" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "QUALIFIED", label: "Qualified" },
  { key: "QUOTED", label: "Quoted" },
  { key: "WON", label: "Won" },
  { key: "LOST", label: "Lost" },
]

function formatCurrency(value: number | null) {
  if (value == null) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

function isOverdue(dateStr: string | null) {
  if (!dateStr) return false
  const d = parseISO(dateStr)
  return isValid(d) && isBefore(d, new Date())
}

function resolveTargetStage(
  overId: string | undefined,
  leads: Lead[]
): Lead["stage"] | null {
  if (!overId) return null
  if (overId.startsWith("column:")) {
    const raw = overId.slice(7)
    if (STAGES.some((s) => s.key === raw)) return raw as Lead["stage"]
    return null
  }
  if (overId.startsWith("lead:")) {
    const id = overId.slice(5)
    const hit = leads.find((l) => l.id === id)
    return hit?.stage ?? null
  }
  return null
}

function KanbanLeadCard({ lead }: { lead: Lead }) {
  const overdue = isOverdue(lead.next_follow_up_at)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `lead:${lead.id}`,
    data: { lead },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex gap-1 rounded-md bg-white border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all",
        isDragging && "opacity-60 shadow-md z-10"
      )}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500 py-3 pl-2 pr-0 touch-none"
        {...listeners}
        {...attributes}
        aria-label={`Drag ${lead.name}`}
      >
        <GripVertical className="w-4 h-4" strokeWidth={1.75} />
      </button>
      <Link
        href={`/leads/${lead.id}`}
        className="flex-1 min-w-0 py-3 pr-3 block"
      >
        <h3 className="text-xs font-semibold text-zinc-700 leading-snug mb-2">
          {lead.name}
        </h3>
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <TenantPill tenantId={lead.tenant_id} />
          {lead.source && (
            <span className="text-[10px] text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-sm">
              {lead.source}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs font-mono text-emerald-400">
            <DollarSign className="w-3 h-3" strokeWidth={1.75} />
            {formatCurrency(lead.revenue_potential)}
          </div>
          {lead.next_follow_up_at && (
            <span
              className={cn(
                "text-[10px] font-mono",
                overdue ? "text-byred-red" : "text-zinc-500"
              )}
            >
              {overdue ? "Overdue" : "Follow up"}{" "}
              {new Date(lead.next_follow_up_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>
      </Link>
    </div>
  )
}

function StageDropZone({
  stageKey,
  label,
  children,
}: {
  stageKey: Lead["stage"]
  label: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${stageKey}`,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-1 rounded-md border border-zinc-200 bg-zinc-50 p-2 space-y-2 min-h-[200px]",
        isOver && "ring-2 ring-byred-red/35 bg-white"
      )}
      role="region"
      aria-label={`${label} column`}
    >
      {children}
    </div>
  )
}

interface LeadsKanbanProps {
  initialLeads: Lead[]
}

export function LeadsKanban({ initialLeads }: LeadsKanbanProps) {
  const router = useRouter()
  const { activeTenantId, setActiveTenantId } = useUser()
  const [leads, setLeads] = useState(initialLeads)
  const [activeLead, setActiveLead] = useState<Lead | null>(null)

  useEffect(() => {
    setLeads(initialLeads)
  }, [initialLeads])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const totalPipeline = leads
    .filter((l) => ["NEW", "CONTACTED", "QUALIFIED", "QUOTED"].includes(l.stage))
    .reduce((sum, l) => sum + (l.revenue_potential ?? 0), 0)

  const wonLeads = leads.filter((l) => l.stage === "WON").length
  const totalClosed = leads.filter((l) =>
    ["WON", "LOST"].includes(l.stage)
  ).length
  const conversionRate =
    totalClosed > 0 ? Math.round((wonLeads / totalClosed) * 100) : 0

  const overdueFollowUps = leads.filter(
    (l) =>
      l.next_follow_up_at &&
      isOverdue(l.next_follow_up_at) &&
      l.stage !== "WON" &&
      l.stage !== "LOST"
  ).length

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id)
    if (!id.startsWith("lead:")) return
    const leadId = id.slice(5)
    setActiveLead(leads.find((l) => l.id === leadId) ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveLead(null)

    if (!over) return

    const activeId = String(active.id)
    if (!activeId.startsWith("lead:")) return

    const leadId = activeId.slice(5)
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return

    const targetStage = resolveTargetStage(String(over.id), leads)
    if (!targetStage || targetStage === lead.stage) return

    const previousStage = lead.stage
    const snapshot = leads

    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, stage: targetStage } : l
      )
    )

    try {
      await syncActiveTenantForMutation(
        setActiveTenantId,
        activeTenantId,
        lead.tenant_id
      )
      const result = await updateLeadStageAction({
        leadId,
        tenantId: lead.tenant_id,
        stage: targetStage,
        previousStage,
      })
      if (!result.ok) {
        setLeads(snapshot)
        toast.error(result.error)
        return
      }
      toast.success(`Moved to ${STAGES.find((s) => s.key === targetStage)?.label ?? targetStage}`)
      router.refresh()
    } catch {
      setLeads(snapshot)
      toast.error("Could not update stage.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-condensed font-bold text-zinc-900 tracking-tight">
            Leads
          </h1>
        </div>
        <Button
          className="bg-byred-red hover:bg-byred-red-hot text-white gap-2"
          onClick={() => router.push("/leads/new")}
        >
          <Plus className="w-4 h-4" strokeWidth={1.75} />
          New lead
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-md bg-white border border-zinc-200 shadow-sm">
          <p className="text-2xl font-condensed font-bold text-emerald-600">
            {formatCurrency(totalPipeline)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Total pipeline</p>
        </div>
        <div className="p-4 rounded-md bg-white border border-zinc-200 shadow-sm">
          <p className="text-2xl font-condensed font-bold text-zinc-800">
            {conversionRate}%
          </p>
          <p className="text-xs text-zinc-500 mt-1">Conversion rate</p>
        </div>
        <div className="p-4 rounded-md bg-white border border-zinc-200 shadow-sm">
          <p
            className={cn(
              "text-2xl font-condensed font-bold",
              overdueFollowUps > 0 ? "text-byred-red" : "text-zinc-400"
            )}
          >
            {overdueFollowUps}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Overdue follow-ups</p>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={(e) => void handleDragEnd(e)}
      >
        <div className="overflow-x-auto pb-4">
          <div
            className="flex gap-4"
            style={{ minWidth: `${STAGES.length * 296}px` }}
          >
            {STAGES.map(({ key, label }) => {
              const stageLeads = leads.filter((l) => l.stage === key)
              return (
                <div key={key} className="flex flex-col" style={{ minWidth: "280px" }}>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-condensed font-semibold uppercase tracking-wide text-zinc-600">
                        {label}
                      </h3>
                      <span className="text-xs text-zinc-400 font-mono bg-zinc-100 px-1.5 py-0.5 rounded-sm">
                        {stageLeads.length}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 text-zinc-400 hover:text-zinc-700"
                      onClick={() => router.push("/leads/new")}
                      aria-label={`Add lead to ${label}`}
                    >
                      <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </Button>
                  </div>

                  <StageDropZone stageKey={key} label={label}>
                    {stageLeads.length === 0 ? (
                      <p className="text-xs text-zinc-400 text-center py-8">
                        No {label.toLowerCase()} leads.
                      </p>
                    ) : (
                      stageLeads.map((lead) => (
                        <KanbanLeadCard key={lead.id} lead={lead} />
                      ))
                    )}
                  </StageDropZone>
                </div>
              )
            })}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeLead ? (
            <div className="rounded-md bg-white border border-byred-red/40 shadow-lg p-3 max-w-[260px] pointer-events-none">
              <p className="text-xs font-semibold text-zinc-800 line-clamp-2">
                {activeLead.name}
              </p>
              <div className="mt-2">
                <TenantPill tenantId={activeLead.tenant_id} />
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
