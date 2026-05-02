"use client"

import { use, useState, useRef } from "react"
import Link from "next/link"
import {
  ArrowLeft, AlertTriangle, CheckCircle2, Clock,
  Send, Tag, Users, Calendar, FileText, Activity, Loader2,
} from "lucide-react"
import { MOCK_TASKS, MOCK_COMMENTS, MOCK_TEAM } from "@/components/byred/os/mock-data"
import { OSStatusBadge, OSPriorityBadge, OSBlockerBadge } from "@/components/byred/os/os-badge"
import { OSAvatar } from "@/components/byred/os/os-avatar"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type OSTask = (typeof MOCK_TASKS)[0]

const STATUS_OPTIONS = ["not_started", "in_progress", "blocked", "done"] as const
const PRIORITY_OPTIONS = ["critical", "high", "medium", "low"] as const

function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-zinc-800/60 last:border-0">
      <div className="flex items-center gap-2 w-28 shrink-0">
        <Icon className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
        <span className="text-xs text-zinc-600">{label}</span>
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

export default function OSTaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>
}) {
  const { taskId } = use(params)
  const initialTask = MOCK_TASKS.find((t) => t.id === taskId) ?? null
  const [task, setTask] = useState<OSTask | null>(initialTask)
  const [comments, setComments] = useState(MOCK_COMMENTS.filter((c) => c.entity_id === taskId))
  const [commentInput, setCommentInput] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  const [savingField, setSavingField] = useState<string | null>(null)
  const commentRef = useRef<HTMLInputElement>(null)

  if (!task) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-500 text-sm">Task not found.</p>
      </div>
    )
  }

  const owner = task.owner_user_id ? MOCK_TEAM.find((m) => m.id === task.owner_user_id) : null
  const today = new Date().toISOString().split("T")[0]
  const isOverdue = task.due_date && task.due_date < today && task.status !== "done"

  // Optimistic PATCH helper
  async function patchTask(field: string, value: string | null) {
    const prev = { ...task }
    setTask((t) => t ? { ...t, [field]: value } : t)
    setSavingField(field)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Update failed")
      }
    } catch (err) {
      setTask(prev)
      toast.error(err instanceof Error ? err.message : "Failed to update task.")
    } finally {
      setSavingField(null)
    }
  }

  async function submitComment() {
    const body = commentInput.trim()
    if (!body) return
    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to post comment")
      }
      const { comment } = await res.json()
      setComments((prev) => [...prev, comment])
      setCommentInput("")
      commentRef.current?.focus()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post comment.")
    } finally {
      setSubmittingComment(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-0">
      {/* Back nav */}
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/os/tasks"
          className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-zinc-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-zinc-600">
          <Link href="/os/tasks" className="hover:text-zinc-400">Tasks</Link>
          <span>/</span>
          <span className="text-zinc-400 truncate">{task.title}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Main content */}
        <div className="space-y-5">
          {/* Title + description */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <OSStatusBadge status={task.status} />
              <OSPriorityBadge priority={task.priority} />
              {task.blocker_flag && <OSBlockerBadge />}
              {task.monday_item_id && (
                <span className="text-[10px] text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded">
                  Monday #{task.monday_item_id}
                </span>
              )}
            </div>
            <h1 className="text-xl font-semibold text-white leading-snug mb-3">{task.title}</h1>
            {task.description && (
              <p className="text-sm text-zinc-400 leading-relaxed">{task.description}</p>
            )}
            {task.blocker_flag && task.blocker_reason && (
              <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-lg bg-red-950/40 border border-red-800/40">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" strokeWidth={2} />
                <div>
                  <p className="text-xs font-semibold text-red-300 mb-0.5">Blocker</p>
                  <p className="text-xs text-red-400/80">{task.blocker_reason}</p>
                </div>
              </div>
            )}
          </div>

          {/* Definition of Done */}
          {task.definition_of_done && (
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" strokeWidth={1.75} />
                <span className="text-sm font-medium text-white">Definition of Done</span>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">{task.definition_of_done}</p>
            </div>
          )}

          {/* Comments */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-400" strokeWidth={1.75} />
              <span className="text-sm font-medium text-white">
                Comments
                {comments.length > 0 && (
                  <span className="ml-1.5 text-xs text-zinc-600">({comments.length})</span>
                )}
              </span>
            </div>

            {comments.length > 0 && (
              <div className="divide-y divide-zinc-800/60">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3 px-5 py-4">
                    <OSAvatar name={c.user_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-zinc-200">{c.user_name}</span>
                        <span className="text-[10px] text-zinc-600">
                          {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" · "}
                          {new Date(c.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 leading-relaxed">{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Comment input */}
            <div className="px-5 py-4 bg-black/20">
              <div className="flex items-center gap-2">
                <input
                  ref={commentRef}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment() } }}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                />
                <button
                  onClick={submitComment}
                  disabled={!commentInput.trim() || submittingComment}
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                    commentInput.trim() && !submittingComment
                      ? "bg-[#D7261E] text-white hover:bg-[#B51E18]"
                      : "bg-zinc-800 text-zinc-600 border border-zinc-700"
                  )}
                >
                  {submittingComment
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />
                    : <Send className="w-3.5 h-3.5" strokeWidth={1.75} />
                  }
                </button>
              </div>
            </div>
          </div>

          {/* Activity */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-zinc-600" strokeWidth={1.75} />
              <span className="text-sm font-medium text-zinc-500">Activity</span>
              <span className="text-[10px] text-zinc-700 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded ml-auto">
                Coming soon
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar meta — inline editable */}
        <div className="space-y-4">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">Details</p>
            <div>
              {/* Status — inline select */}
              <MetaRow icon={Tag} label="Status">
                <div className="flex items-center gap-2">
                  <select
                    value={task.status}
                    onChange={(e) => patchTask("status", e.target.value)}
                    disabled={savingField === "status"}
                    className="bg-transparent text-xs text-zinc-300 border-0 focus:outline-none cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s} className="bg-zinc-900">{s.replace("_", " ")}</option>
                    ))}
                  </select>
                  {savingField === "status" && <Loader2 className="w-3 h-3 animate-spin text-zinc-600" strokeWidth={1.75} />}
                </div>
              </MetaRow>

              {/* Priority — inline select */}
              <MetaRow icon={Tag} label="Priority">
                <div className="flex items-center gap-2">
                  <select
                    value={task.priority}
                    onChange={(e) => patchTask("priority", e.target.value)}
                    disabled={savingField === "priority"}
                    className="bg-transparent text-xs text-zinc-300 border-0 focus:outline-none cursor-pointer"
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p} className="bg-zinc-900">{p}</option>
                    ))}
                  </select>
                  {savingField === "priority" && <Loader2 className="w-3 h-3 animate-spin text-zinc-600" strokeWidth={1.75} />}
                </div>
              </MetaRow>

              {/* Owner */}
              <MetaRow icon={Users} label="Owner">
                {owner ? (
                  <div className="flex items-center gap-1.5">
                    <OSAvatar name={owner.name} size="xs" />
                    <span className="text-xs text-zinc-300">{owner.name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-600">Unassigned</span>
                )}
              </MetaRow>

              {/* Due date — inline date input */}
              <MetaRow icon={Calendar} label="Due Date">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={task.due_date ?? ""}
                    onChange={(e) => patchTask("due_date", e.target.value || null)}
                    disabled={savingField === "due_date"}
                    className={cn(
                      "bg-transparent text-xs border-0 focus:outline-none cursor-pointer",
                      isOverdue ? "text-red-400" : "text-zinc-300"
                    )}
                  />
                  {savingField === "due_date" && <Loader2 className="w-3 h-3 animate-spin text-zinc-600" strokeWidth={1.75} />}
                </div>
              </MetaRow>

              {task.estimated_minutes && (
                <MetaRow icon={Clock} label="Estimate">
                  <span className="text-xs text-zinc-300">
                    {task.estimated_minutes >= 60
                      ? `${Math.round(task.estimated_minutes / 60)}h`
                      : `${task.estimated_minutes}m`}
                  </span>
                </MetaRow>
              )}

              <MetaRow icon={Tag} label="Tenant">
                <span className="text-xs text-zinc-300 capitalize">{task.tenant_id}</span>
              </MetaRow>
            </div>
          </div>

          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">Created</p>
            <p className="text-xs text-zinc-500">
              {new Date(task.created_at).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
