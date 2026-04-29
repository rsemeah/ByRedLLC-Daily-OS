"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { ChevronLeft, ChevronRight, Calendar, List, Clock, X, MapPin, Link2, Plus, Loader2, AlertCircle } from "lucide-react"
import { useRequiredUser } from "@/lib/context/user-context"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type CalendarEventRow = {
  id: string
  title: string
  description: string | null
  event_type: "meeting" | "deadline" | "milestone" | "task" | "reminder" | "block"
  status: "confirmed" | "tentative" | "cancelled"
  starts_at: string
  ends_at: string
  all_day: boolean
  location: string | null
  meeting_url: string | null
  color: string | null
  project_id: string | null
  task_id: string | null
  tenant_id: string
  created_by_user_id: string | null
  os_calendar_event_attendees: Array<{
    user_id: string
    rsvp: "accepted" | "declined" | "pending"
    byred_users: { name: string; email: string; avatar_url: string | null } | null
  }>
  _source?: "task"
  _task?: {
    status: string
    priority: string
    blocker_flag: boolean
    owner: { name: string; avatar_url: string | null } | null
  }
}

type CalendarResponse = {
  events: CalendarEventRow[]
  taskEvents: CalendarEventRow[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const EVENT_TYPE_LABELS: Record<string, string> = {
  meeting:   "Meeting",
  deadline:  "Deadline",
  milestone: "Milestone",
  task:      "Task Due",
  reminder:  "Reminder",
  block:     "Focus Block",
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  meeting:   "#6366f1",
  deadline:  "#D7261E",
  milestone: "#f59e0b",
  task:      "#3b82f6",
  reminder:  "#8b5cf6",
  block:     "#374151",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEventColor(evt: CalendarEventRow): string {
  if (evt.color) return evt.color
  return EVENT_TYPE_COLORS[evt.event_type] ?? "#3b82f6"
}

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<{ date: number | null; iso: string | null }> = []
  for (let i = 0; i < firstDay; i++) cells.push({ date: null, iso: null })
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    cells.push({ date: d, iso })
  }
  return cells
}

function getMonthRange(year: number, month: number) {
  const from = new Date(year, month, 1).toISOString()
  const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString()
  return { from, to }
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// ─── Sub-components ───────────────────────────────────────────────────────────

function EventPill({
  evt,
  onClick,
}: {
  evt: CalendarEventRow
  onClick: () => void
}) {
  const color = getEventColor(evt)
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-1.5 py-0.5 rounded text-[10px] text-white truncate hover:opacity-80 transition-opacity"
      style={{ backgroundColor: color }}
    >
      {evt.title}
    </button>
  )
}

function EventDetailPanel({
  event,
  onClose,
}: {
  event: CalendarEventRow
  onClose: () => void
}) {
  const color = getEventColor(event)
  const startDate = new Date(event.starts_at)
  const endDate = new Date(event.ends_at)

  const dateLabel = event.all_day
    ? startDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : `${startDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – ${endDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col shadow-2xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <span className="text-sm font-semibold text-white">Event Detail</span>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-zinc-600 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex-1 p-5 overflow-y-auto space-y-5">
        {/* Color accent */}
        <div className="h-1 rounded-full" style={{ backgroundColor: color }} />

        {/* Type + Title */}
        <div>
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest">
            {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
          </span>
          <h2 className="text-base font-semibold text-white mt-1 leading-snug">
            {event.title}
          </h2>
        </div>

        {event.description && (
          <p className="text-sm text-zinc-400 leading-relaxed">{event.description}</p>
        )}

        {/* Meta */}
        <div className="space-y-2.5">
          <div className="flex items-start gap-2 text-xs">
            <Clock className="w-3.5 h-3.5 text-zinc-600 mt-0.5 shrink-0" strokeWidth={1.75} />
            <span className="text-zinc-400">{dateLabel}</span>
          </div>

          {event.location && (
            <div className="flex items-start gap-2 text-xs">
              <MapPin className="w-3.5 h-3.5 text-zinc-600 mt-0.5 shrink-0" strokeWidth={1.75} />
              <span className="text-zinc-400">{event.location}</span>
            </div>
          )}

          {event.meeting_url && (
            <div className="flex items-start gap-2 text-xs">
              <Link2 className="w-3.5 h-3.5 text-zinc-600 mt-0.5 shrink-0" strokeWidth={1.75} />
              <a
                href={event.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline truncate"
              >
                {event.meeting_url}
              </a>
            </div>
          )}
        </div>

        {/* Task metadata if this is a task-due event */}
        {event._source === "task" && event._task && (
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3 space-y-1.5">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Task Info</p>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded",
                event._task.priority === "critical" ? "bg-red-900/50 text-red-400" :
                event._task.priority === "high"     ? "bg-orange-900/50 text-orange-400" :
                event._task.priority === "medium"   ? "bg-yellow-900/50 text-yellow-400" :
                                                      "bg-zinc-800 text-zinc-500"
              )}>
                {event._task.priority}
              </span>
              <span className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded",
                event._task.status === "in_progress" ? "bg-blue-900/50 text-blue-400" :
                event._task.status === "blocked"      ? "bg-red-900/50 text-red-400" :
                                                        "bg-zinc-800 text-zinc-500"
              )}>
                {event._task.status.replace("_", " ")}
              </span>
              {event._task.blocker_flag && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-900/50 text-red-400">
                  blocker
                </span>
              )}
            </div>
            {event._task.owner && (
              <p className="text-xs text-zinc-500">Owner: {event._task.owner.name}</p>
            )}
          </div>
        )}

        {/* Attendees */}
        {event.os_calendar_event_attendees?.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Attendees</p>
            {event.os_calendar_event_attendees.map((a) => (
              <div key={a.user_id} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] text-zinc-400 font-semibold shrink-0">
                  {a.byred_users?.name?.charAt(0) ?? "?"}
                </div>
                <span className="text-xs text-zinc-400">{a.byred_users?.name ?? a.user_id}</span>
                <span className={cn(
                  "ml-auto text-[10px] px-1.5 py-0.5 rounded",
                  a.rsvp === "accepted"  ? "bg-green-900/40 text-green-400" :
                  a.rsvp === "declined"  ? "bg-red-900/40 text-red-400" :
                                           "bg-zinc-800 text-zinc-500"
                )}>
                  {a.rsvp}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OSCalendarPage() {
  const { activeTenantId } = useRequiredUser()
  const now = new Date()
  const [viewYear, setViewYear]   = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [view, setView]           = useState<"month" | "agenda">("month")
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventRow | null>(null)

  const { from, to } = useMemo(
    () => getMonthRange(viewYear, viewMonth),
    [viewYear, viewMonth]
  )

  const apiUrl = activeTenantId
    ? `/api/os/calendar?tenant_id=${activeTenantId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    : null

  const { data, isLoading, error } = useSWR<CalendarResponse>(apiUrl, fetcher, {
    keepPreviousData: true,
  })

  const allItems: CalendarEventRow[] = useMemo(() => {
    if (!data) return []
    return [...(data.events ?? []), ...(data.taskEvents ?? [])].sort(
      (a, b) => a.starts_at.localeCompare(b.starts_at)
    )
  }, [data])

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])
  const today = now.toISOString().split("T")[0]

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long", year: "numeric",
  })

  function eventsForDay(iso: string) {
    return allItems.filter((e) => e.starts_at.startsWith(iso))
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  const upcomingItems = useMemo(
    () =>
      allItems
        .filter((e) => e.starts_at >= now.toISOString())
        .slice(0, 25),
    [allItems]
  )

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-condensed tracking-tight">Calendar</h1>
          <p className="text-sm text-zinc-500 mt-1">Tasks, milestones and meetings</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setView("month")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                view === "month" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />
              Month
            </button>
            <button
              onClick={() => setView("agenda")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                view === "agenda" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <List className="w-3.5 h-3.5" strokeWidth={1.75} />
              Agenda
            </button>
          </div>
          {/* New Event — placeholder for modal */}
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D7261E] hover:bg-[#b91c1c] text-white text-xs font-medium transition-colors">
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            New Event
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-950/40 border border-red-900/50 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Failed to load calendar events. Check your connection and try again.
        </div>
      )}

      {/* Loading overlay — only on first load */}
      {isLoading && !data && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
        </div>
      )}

      {(!isLoading || data) && (
        <>
          {view === "month" && (
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
              {/* Month nav */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                <button
                  onClick={prevMonth}
                  className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-zinc-600 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" strokeWidth={2} />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{monthLabel}</span>
                  {isLoading && <Loader2 className="w-3 h-3 text-zinc-600 animate-spin" />}
                </div>
                <button
                  onClick={nextMonth}
                  className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-zinc-600 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400" strokeWidth={2} />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-zinc-800">
                {DAYS_OF_WEEK.map((d) => (
                  <div key={d} className="py-2 text-center text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7">
                {cells.map((cell, i) => {
                  const dayEvents = cell.iso ? eventsForDay(cell.iso) : []
                  const isToday = cell.iso === today
                  return (
                    <div
                      key={i}
                      className={cn(
                        "min-h-[80px] border-b border-r border-zinc-800/60 p-1.5",
                        !cell.date && "bg-zinc-950/50",
                        isToday && "bg-[#D7261E]/5"
                      )}
                    >
                      {cell.date && (
                        <>
                          <span className={cn(
                            "inline-flex w-5 h-5 items-center justify-center rounded-full text-[11px] font-medium mb-1",
                            isToday ? "bg-[#D7261E] text-white" : "text-zinc-500"
                          )}>
                            {cell.date}
                          </span>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 2).map((evt) => (
                              <EventPill
                                key={evt.id}
                                evt={evt}
                                onClick={() => setSelectedEvent(evt)}
                              />
                            ))}
                            {dayEvents.length > 2 && (
                              <span className="text-[10px] text-zinc-600 px-1">
                                +{dayEvents.length - 2} more
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {view === "agenda" && (
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-sm font-medium text-white">Upcoming</span>
                <span className="text-xs text-zinc-600">{upcomingItems.length} events</span>
              </div>
              {upcomingItems.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-zinc-600">
                  No upcoming events or task deadlines.
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/60">
                  {upcomingItems.map((evt) => {
                    const color = getEventColor(evt)
                    return (
                      <button
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors text-left"
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                          style={{ backgroundColor: color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-200 font-medium truncate">{evt.title}</p>
                          <p className="text-[10px] text-zinc-600 mt-0.5">
                            {EVENT_TYPE_LABELS[evt.event_type] ?? evt.event_type}
                            {evt._source === "task" && evt._task && (
                              <> · {evt._task.priority} priority</>
                            )}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-zinc-400">
                            {new Date(evt.starts_at).toLocaleDateString("en-US", {
                              month: "short", day: "numeric",
                            })}
                          </p>
                          {!evt.all_day && (
                            <p className="text-[10px] text-zinc-600">
                              {new Date(evt.starts_at).toLocaleTimeString("en-US", {
                                hour: "numeric", minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Event detail side panel */}
      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  )
}
