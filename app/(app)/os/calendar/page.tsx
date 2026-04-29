"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Calendar, List, Clock, X } from "lucide-react"
import { MOCK_CALENDAR_EVENTS, MOCK_TASKS, type OSCalendarEvent } from "@/components/byred/os/mock-data"
import { cn } from "@/lib/utils"

const EVENT_TYPE_LABELS: Record<string, string> = {
  task_due:  "Task Due",
  milestone: "Milestone",
  meeting:   "Meeting",
  deadline:  "Deadline",
  reminder:  "Reminder",
}

// Combine calendar events + tasks with due dates
function buildCalendarItems() {
  const items: Array<OSCalendarEvent & { _from: "event" | "task" }> = [
    ...MOCK_CALENDAR_EVENTS.map((e) => ({ ...e, _from: "event" as const })),
    ...MOCK_TASKS
      .filter((t) => t.due_date && t.status !== "done")
      .map((t) => ({
        id: `task-${t.id}`,
        tenant_id: t.tenant_id,
        project_id: t.project_id,
        board_id: t.board_id,
        task_id: t.id,
        title: t.title,
        description: t.description,
        event_type: "task_due" as const,
        status: (t.status === "blocked" ? "upcoming" : "upcoming") as "upcoming",
        start_at: t.due_date + "T23:59:00Z",
        end_at: null,
        all_day: true,
        owner_user_id: t.owner_user_id,
        calendar_color: t.blocker_flag ? "#D7261E" : "#3b82f6",
        calendar_label: t.tenant_id,
        related_entity_type: "task" as string | null,
        related_entity_id: t.id as string | null,
        _from: "task" as const,
      })),
  ]
  return items
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

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

export default function OSCalendarPage() {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [view, setView] = useState<"month" | "agenda">("month")
  const [selectedEvent, setSelectedEvent] = useState<(typeof calItems)[0] | null>(null)

  const calItems = buildCalendarItems()
  const cells = buildMonthGrid(viewYear, viewMonth)
  const today = now.toISOString().split("T")[0]

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long", year: "numeric",
  })

  function eventsForDay(iso: string) {
    return calItems.filter((e) => e.start_at.startsWith(iso))
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const upcomingItems = calItems
    .filter((e) => e.start_at >= now.toISOString())
    .sort((a, b) => a.start_at.localeCompare(b.start_at))
    .slice(0, 20)

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-condensed tracking-tight">Calendar</h1>
          <p className="text-sm text-zinc-500 mt-1">Tasks, milestones and meetings</p>
        </div>
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
      </div>

      {view === "month" && (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <button onClick={prevMonth} className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-zinc-600 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" strokeWidth={2} />
            </button>
            <span className="text-sm font-semibold text-white">{monthLabel}</span>
            <button onClick={nextMonth} className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-zinc-600 transition-colors">
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
                    "min-h-[80px] border-b border-r border-zinc-800/60 p-1.5 last:border-r-0",
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
                          <button
                            key={evt.id}
                            onClick={() => setSelectedEvent(evt)}
                            className="w-full text-left px-1.5 py-0.5 rounded text-[10px] text-white truncate hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: evt.calendar_color ?? "#3b82f6" }}
                          >
                            {evt.title}
                          </button>
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
          <div className="px-5 py-4 border-b border-zinc-800">
            <span className="text-sm font-medium text-white">Upcoming Events</span>
          </div>
          {upcomingItems.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-zinc-600">No upcoming events.</div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {upcomingItems.map((evt) => (
                <button
                  key={evt.id}
                  onClick={() => setSelectedEvent(evt)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/3 transition-colors text-left"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                    style={{ backgroundColor: evt.calendar_color ?? "#3b82f6" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 font-medium truncate">{evt.title}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      {EVENT_TYPE_LABELS[evt.event_type] ?? evt.event_type}
                      {evt.calendar_label && ` · ${evt.calendar_label}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-zinc-400">
                      {new Date(evt.start_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric",
                      })}
                    </p>
                    {!evt.all_day && (
                      <p className="text-[10px] text-zinc-600">
                        {new Date(evt.start_at).toLocaleTimeString("en-US", {
                          hour: "numeric", minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Event detail panel */}
      {selectedEvent && (
        <div className="fixed inset-y-0 right-0 w-80 bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <span className="text-sm font-semibold text-white">Event Detail</span>
            <button
              onClick={() => setSelectedEvent(null)}
              className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-zinc-600 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
            </button>
          </div>
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {/* Color strip */}
            <div
              className="h-1 rounded-full"
              style={{ backgroundColor: selectedEvent.calendar_color ?? "#3b82f6" }}
            />
            <div>
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest">
                {EVENT_TYPE_LABELS[selectedEvent.event_type] ?? selectedEvent.event_type}
              </span>
              <h2 className="text-base font-semibold text-white mt-1 leading-snug">
                {selectedEvent.title}
              </h2>
            </div>

            {selectedEvent.description && (
              <p className="text-sm text-zinc-400 leading-relaxed">{selectedEvent.description}</p>
            )}

            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
                <span className="text-zinc-400">
                  {selectedEvent.all_day
                    ? new Date(selectedEvent.start_at).toLocaleDateString("en-US", {
                        weekday: "short", month: "short", day: "numeric",
                      })
                    : new Date(selectedEvent.start_at).toLocaleString("en-US", {
                        weekday: "short", month: "short", day: "numeric",
                        hour: "numeric", minute: "2-digit",
                      })}
                </span>
              </div>
              {selectedEvent.calendar_label && (
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: selectedEvent.calendar_color ?? "#3b82f6" }}
                  />
                  <span className="text-zinc-400">{selectedEvent.calendar_label}</span>
                </div>
              )}
              {selectedEvent.related_entity_type && (
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
                  <span className="text-zinc-500 capitalize">
                    {selectedEvent.related_entity_type}: {selectedEvent.related_entity_id}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
