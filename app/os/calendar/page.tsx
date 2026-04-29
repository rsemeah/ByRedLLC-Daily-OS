'use client'

import { useEffect, useRef, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useUser } from '@/lib/context/user-context'

type CalendarItem = {
  id: string
  title: string
  start_at: string
  end_at: string | null
  all_day: boolean
  color: string
  source: 'event' | 'task'
  priority?: string | null
  status?: string | null
  blocker?: boolean
  tenant_id: string
  owner_user_id?: string | null
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarPage() {
  const { activeTenantId } = useUser()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [items, setItems] = useState<CalendarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refetching, setRefetching] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (!activeTenantId) return

    const start = startOfMonth(month).toISOString()
    const end = endOfMonth(month).toISOString()

    if (!initialized.current) {
      setLoading(true)
    } else {
      setRefetching(true)
    }

    const controller = new AbortController()

    fetch(
      `/api/os/calendar?tenant_id=${activeTenantId}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then(({ items: fetched }: { items: CalendarItem[] }) => {
        setItems(fetched ?? [])
        setLoading(false)
        setRefetching(false)
        initialized.current = true
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        console.error('Calendar fetch error', err)
        setLoading(false)
        setRefetching(false)
      })

    return () => controller.abort()
  }, [activeTenantId, month])

  const calDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  })

  function itemsForDay(day: Date): CalendarItem[] {
    return items.filter((item) => isSameDay(parseISO(item.start_at), day))
  }

  if (loading) return <CalendarSkeleton />

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-5 h-5" style={{ color: '#D7261E' }} strokeWidth={1.75} />
          <h1 className="text-2xl font-condensed font-bold tracking-tight">Calendar</h1>
        </div>
        <div className="flex items-center gap-1">
          {refetching && (
            <Loader2 className="w-4 h-4 animate-spin mr-1" style={{ color: '#D7261E' }} />
          )}
          <button
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="w-8 h-8 flex items-center justify-center rounded transition"
            style={{ color: '#A1A1AA' }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = 'transparent')
            }
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
          </button>
          <span className="text-sm font-medium w-36 text-center tabular-nums select-none">
            {format(month, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="w-8 h-8 flex items-center justify-center rounded transition"
            style={{ color: '#A1A1AA' }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = 'transparent')
            }
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
          </button>
          <button
            onClick={() => setMonth(startOfMonth(new Date()))}
            className="ml-2 px-3 py-1 text-xs font-semibold rounded transition"
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#A1A1AA',
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)')
            }
          >
            Today
          </button>
        </div>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-bold tracking-widest uppercase py-2"
            style={{ color: '#52525B' }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className="grid grid-cols-7 border-t border-l"
        style={{ borderColor: 'rgba(255,255,255,0.07)' }}
      >
        {calDays.map((day) => {
          const dayItems = itemsForDay(day)
          const inMonth = isSameMonth(day, month)
          const today = isToday(day)

          return (
            <div
              key={day.toISOString()}
              className="min-h-[104px] p-2 border-b border-r flex flex-col"
              style={{
                borderColor: 'rgba(255,255,255,0.07)',
                background: today
                  ? 'rgba(215,38,30,0.06)'
                  : inMonth
                    ? '#18181B'
                    : '#0F0F10',
              }}
            >
              <span
                className="text-xs mb-1 w-6 h-6 flex items-center justify-center rounded-full shrink-0"
                style={{
                  color: today ? '#fff' : inMonth ? '#A1A1AA' : '#3f3f46',
                  background: today ? '#D7261E' : 'transparent',
                  fontWeight: today ? 700 : 400,
                }}
              >
                {format(day, 'd')}
              </span>

              <div className="flex flex-col gap-0.5 min-w-0">
                {dayItems.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    title={`${item.source === 'task' ? '📋 ' : '📅 '}${item.title}`}
                    className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium leading-tight cursor-default"
                    style={{
                      background: `${item.color}22`,
                      color: item.color,
                      border: `1px solid ${item.color}44`,
                    }}
                  >
                    {item.title}
                  </div>
                ))}
                {dayItems.length > 3 && (
                  <span className="text-[9px] px-1 leading-tight" style={{ color: '#52525B' }}>
                    +{dayItems.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4">
        {[
          { color: '#D7261E', label: 'Blocker / Deadline' },
          { color: '#ea7400', label: 'High / Critical' },
          { color: '#2563eb', label: 'Task / Event' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: color }}
            />
            <span className="text-[10px]" style={{ color: '#71717A' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CalendarSkeleton() {
  return (
    <div className="p-6 max-w-6xl mx-auto animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-32 rounded" style={{ background: '#27272A' }} />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded" style={{ background: '#27272A' }} />
          <div className="h-5 w-36 rounded" style={{ background: '#27272A' }} />
          <div className="h-8 w-8 rounded" style={{ background: '#27272A' }} />
          <div className="h-7 w-16 rounded ml-2" style={{ background: '#27272A' }} />
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-5 rounded" style={{ background: '#27272A' }} />
        ))}
      </div>
      <div className="grid grid-cols-7" style={{ gap: '1px', background: 'rgba(255,255,255,0.07)' }}>
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-24 p-2" style={{ background: '#18181B' }}>
            <div className="h-4 w-4 rounded-full" style={{ background: '#27272A' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
