"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ChevronRight,
  Sparkles,
  FileText,
  Zap,
  Copy,
  CheckCircle,
} from "lucide-react"
import { formatDistanceToNow, parseISO, format } from "date-fns"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { TenantPill } from "@/components/byred/tenant-pill"
import { StatusBadge } from "@/components/byred/status-badge"
import { PriorityFlag } from "@/components/byred/priority-flag"
import { DueDateCell } from "@/components/byred/due-date-cell"
import { AiModeChip } from "@/components/byred/ai-mode-chip"
import { BlockerBanner } from "@/components/byred/blocker-banner"
import { ActivityItem } from "@/components/byred/activity-item"
import { useUser } from "@/lib/context/user-context"
import { syncActiveTenantForMutation } from "@/lib/client/sync-active-tenant"
import { updateTaskFieldsAction } from "@/lib/actions/tasks"
import type { Task, Activity, AiMode, TaskPriority, TaskStatus } from "@/types/db"

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-byred-red rounded-full transition-all"
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
      <span className="text-xs text-zinc-400 font-mono w-4">{value}</span>
    </div>
  )
}

interface AiActionResult {
  type: "assist" | "draft" | "execute"
  content: string
}

interface TaskDetailProps {
  task: Task
  activities: Activity[]
}

export function TaskDetail({ task, activities }: TaskDetailProps) {
  const router = useRouter()
  const currentUser = useUser()
  const { activeTenantId, setActiveTenantId } = currentUser
  const displayName =
    currentUser?.profile?.name ?? currentUser?.authUser?.email ?? "User"
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const [title, setTitle] = useState(task.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [blockerFlag, setBlockerFlag] = useState(task.blocker_flag)
  const [status, setStatus] = useState<TaskStatus>(
    (task.status ?? "not_started") as TaskStatus
  )
  const [priority, setPriority] = useState<TaskPriority>(
    (task.priority ?? "medium") as TaskPriority
  )
  const [aiMode, setAiMode] = useState<AiMode>(
    (task.ai_mode ?? "HUMAN_ONLY") as AiMode
  )
  const [blockerReason, setBlockerReason] = useState(task.blocker_reason ?? "")
  const [aiResult, setAiResult] = useState<AiActionResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTitle(task.title)
    setBlockerFlag(task.blocker_flag)
    setStatus((task.status ?? "not_started") as TaskStatus)
    setPriority((task.priority ?? "medium") as TaskPriority)
    setAiMode((task.ai_mode ?? "HUMAN_ONLY") as AiMode)
    setBlockerReason(task.blocker_reason ?? "")
  }, [task])

  async function handleAiAction(type: "assist" | "draft" | "execute") {
    setAiLoading(true)
    setAiResult({ type, content: "" })
    try {
      const res = await fetch("/api/ai/task-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          tenantId: task.tenant_id,
          action: type,
          userDisplayName: displayName,
        }),
      })

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        toast.error(err?.error ?? "AI request failed.")
        setAiResult(null)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        toast.error("No response stream.")
        setAiResult(null)
        return
      }

      const decoder = new TextDecoder()
      let content = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        content += decoder.decode(value, { stream: true })
        setAiResult({ type, content })
      }

      if (!content.trim()) {
        toast.error("Empty AI response.")
        setAiResult(null)
        return
      }

      toast.success("AI response generated.")
    } catch {
      toast.error("Could not reach AI.")
      setAiResult(null)
    } finally {
      setAiLoading(false)
    }
  }

  async function persistFields(patch: Parameters<typeof updateTaskFieldsAction>[0]) {
    try {
      await syncActiveTenantForMutation(
        setActiveTenantId,
        activeTenantId,
        task.tenant_id
      )
      const result = await updateTaskFieldsAction(patch)
      if (!result.ok) {
        toast.error(result.error)
        return false
      }
      router.refresh()
      return true
    } catch {
      toast.error("Could not save task.")
      return false
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const ok = await persistFields({
        taskId: task.id,
        tenantId: task.tenant_id,
        status,
        priority,
        ai_mode: aiMode,
        blocker_flag: blockerFlag,
        blocker_reason: blockerFlag ? blockerReason.trim() || null : null,
      })
      if (ok) toast.success("Task updated.")
    } finally {
      setSaving(false)
    }
  }

  async function handleTitleBlur() {
    setEditingTitle(false)
    const next = title.trim()
    if (next === task.title) return
    const ok = await persistFields({
      taskId: task.id,
      tenantId: task.tenant_id,
      title: next,
    })
    if (ok) {
      toast.success("Title saved.")
    } else {
      setTitle(task.title)
    }
  }

  async function handleUnblock() {
    setBlockerFlag(false)
    const ok = await persistFields({
      taskId: task.id,
      tenantId: task.tenant_id,
      blocker_flag: false,
      blocker_reason: null,
    })
    if (ok) {
      setBlockerReason("")
      toast.success("Task unblocked.")
    } else {
      setBlockerFlag(task.blocker_flag)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left: main content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-1.5 text-xs text-zinc-400"
          aria-label="Breadcrumb"
        >
          <Link href="/tasks" className="hover:text-zinc-700 transition-colors">
            Tasks
          </Link>
          <ChevronRight className="w-3 h-3" strokeWidth={1.75} />
          <span className="text-zinc-500 truncate max-w-[200px]">
            {task.title.slice(0, 40)}
            {task.title.length > 40 ? "..." : ""}
          </span>
        </nav>

        {/* Title */}
        <div>
          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => void handleTitleBlur()}
              className="w-full text-2xl font-condensed font-bold text-zinc-800 tracking-tight bg-transparent border-b border-byred-red outline-none pb-1"
            />
          ) : (
            <h1
              className="text-2xl font-condensed font-bold text-zinc-800 tracking-tight cursor-text hover:opacity-80 transition-opacity"
              onClick={() => setEditingTitle(true)}
              title="Click to edit"
            >
              {title}
            </h1>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <TenantPill tenantId={task.tenant_id} />
            <DueDateCell dueDate={task.due_date} />
            <PriorityFlag priority={priority} showLabel />
            <StatusBadge status={status} />
            <AiModeChip mode={aiMode} />
          </div>
        </div>

        {/* Blocker banner */}
        {blockerFlag && (
          <BlockerBanner
            reason={blockerReason || task.blocker_reason}
            onUnblock={() => void handleUnblock()}
          />
        )}

        {/* Blocked by */}
        {task.blocked_by_task_id && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Blocked by:</span>
            <Link
              href={`/tasks/${task.blocked_by_task_id}`}
              className="text-xs text-byred-red hover:underline underline-offset-2 font-mono"
            >
              {task.blocked_by_task_id}
            </Link>
          </div>
        )}

        {/* Description */}
        <div>
          <h3 className="text-sm font-medium text-zinc-500 mb-2">Description</h3>
          <Card className="bg-white border-zinc-200">
            <CardContent className="p-4">
              {task.description ? (
                <div className="prose prose-sm max-w-none text-zinc-600 leading-relaxed">
                  <ReactMarkdown>{task.description}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-xs text-zinc-400">No description.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Metadata */}
        <div>
          <h3 className="text-sm font-medium text-zinc-500 mb-2">Metadata</h3>
          <Card className="bg-white border-zinc-200">
            <CardContent className="p-4">
              <dl className="space-y-3 text-sm">
                {task.monday_item_id && (
                  <div className="flex justify-between">
                    <dt className="text-zinc-400">Monday ID</dt>
                    <dd>
                      <a
                        href={`https://monday.com/boards/item/${task.monday_item_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-byred-red hover:underline"
                      >
                        {task.monday_item_id}
                      </a>
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-zinc-400">Estimated</dt>
                  <dd className="text-zinc-600 font-mono text-xs">
                    {task.estimated_minutes < 60
                      ? `${task.estimated_minutes}m`
                      : `${Math.floor(task.estimated_minutes / 60)}h ${task.estimated_minutes % 60 > 0 ? `${task.estimated_minutes % 60}m` : ""}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-400 mb-1.5">Revenue impact</dt>
                  <dd>
                    <ScoreBar value={task.revenue_impact_score} />
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-400 mb-1.5">Urgency</dt>
                  <dd>
                    <ScoreBar value={task.urgency_score} />
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-400">Owner</dt>
                  <dd>
                    {task.owner_user_id ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-byred-red/10 border border-byred-red/20 flex items-center justify-center">
                          <span className="text-[9px] font-semibold text-byred-red font-condensed">
                            {initials}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-600">
                          {displayName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">Unassigned</span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-400">Created</dt>
                  <dd
                    className="text-xs text-zinc-500 font-mono"
                    title={format(parseISO(task.created_at), "PPpp")}
                  >
                    {formatDistanceToNow(parseISO(task.created_at), {
                      addSuffix: true,
                    })}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Activity */}
        <div>
          <h3 className="text-sm font-medium text-zinc-500 mb-2">Activity</h3>
          {activities.length === 0 ? (
            <p className="text-xs text-zinc-400">No activity.</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {activities.map((a) => (
                <ActivityItem key={a.id} activity={a} showObject={false} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: sticky sidebar */}
      <div className="space-y-4 lg:sticky lg:top-20 self-start">
        {/* AI Actions */}
        <Card className="bg-white border-zinc-200 shadow-sm">
          <CardHeader className="pb-3">
            <h3 className="text-sm font-condensed font-semibold text-zinc-600 uppercase tracking-wide">
              AI Actions
            </h3>
          </CardHeader>
          <CardContent className="space-y-3">
            {task.ai_mode === "HUMAN_ONLY" && (
              <p className="text-xs text-zinc-400">
                This task is marked human-only.
              </p>
            )}

            {(task.ai_mode === "AI_ASSIST" ||
              task.ai_mode === "AI_DRAFT" ||
              task.ai_mode === "AI_EXECUTE") && (
              <Button
                className="w-full bg-byred-red hover:bg-byred-red-hot text-white text-sm gap-2"
                onClick={() => handleAiAction("assist")}
                disabled={aiLoading}
              >
                <Sparkles className="w-4 h-4" strokeWidth={1.75} />
                Suggest 3 actions
              </Button>
            )}

            {(task.ai_mode === "AI_DRAFT" ||
              task.ai_mode === "AI_EXECUTE") && (
              <Button
                variant="outline"
                className="w-full border-zinc-300 text-zinc-600 hover:text-zinc-800 hover:bg-zinc-50 text-sm gap-2"
                onClick={() => handleAiAction("draft")}
                disabled={aiLoading}
              >
                <FileText className="w-4 h-4" strokeWidth={1.75} />
                Draft content
              </Button>
            )}

            {task.ai_mode === "AI_EXECUTE" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full bg-byred-red hover:bg-byred-red-hot text-white text-sm gap-2"
                  >
                    <Zap className="w-4 h-4" strokeWidth={1.75} />
                    Auto-execute
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white border-zinc-200">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-zinc-800">
                      Auto-execute this task?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-zinc-500">
                      This will run without further confirmation. Continue?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-zinc-300 text-zinc-600 hover:text-zinc-800">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-byred-red hover:bg-byred-red-hot text-white"
                      onClick={(e) => {
                        e.preventDefault()
                        void handleAiAction("execute")
                      }}
                    >
                      Execute
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* AI Result */}
            {aiResult && (
              <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-widest">
                    {aiResult.type === "assist"
                      ? "AI Suggestions"
                      : aiResult.type === "draft"
                        ? "Draft"
                        : "Execution plan"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 text-zinc-400 hover:text-zinc-700"
                    onClick={() => {
                      navigator.clipboard.writeText(aiResult.content)
                      toast.success("Copied.")
                    }}
                  >
                    <Copy className="w-3 h-3" strokeWidth={1.75} />
                  </Button>
                </div>
                <div className="prose prose-xs max-w-none text-zinc-600 text-xs leading-relaxed overflow-y-auto max-h-48">
                  <ReactMarkdown>{aiResult.content}</ReactMarkdown>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="bg-white border-zinc-200 shadow-sm">
          <CardHeader className="pb-3">
            <h3 className="text-sm font-condensed font-semibold text-zinc-600 uppercase tracking-wide">
              Settings
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Blocker toggle */}
            <div className="flex items-center justify-between">
              <Label
                htmlFor="blocker-toggle"
                className="text-xs text-zinc-500 cursor-pointer"
              >
                Blocker
              </Label>
              <Switch
                id="blocker-toggle"
                checked={blockerFlag}
                onCheckedChange={setBlockerFlag}
                className="data-[state=checked]:bg-byred-red"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as TaskStatus)}
              >
                <SelectTrigger className="h-8 bg-white border-zinc-300 text-xs text-zinc-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200 shadow-md">
                  {[
                    "not_started",
                    "in_progress",
                    "overdue",
                    "done",
                    "blocked",
                    "cancelled",
                  ].map((s) => (
                    <SelectItem
                      key={s}
                      value={s}
                      className="text-xs text-zinc-600 capitalize"
                    >
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TaskPriority)}
              >
                <SelectTrigger className="h-8 bg-white border-zinc-300 text-xs text-zinc-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200 shadow-md">
                  {["critical", "high", "medium", "low"].map((p) => (
                    <SelectItem
                      key={p}
                      value={p}
                      className="text-xs text-zinc-600 capitalize"
                    >
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* AI Mode */}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">AI Mode</Label>
              <Select
                value={aiMode}
                onValueChange={(v) => setAiMode(v as AiMode)}
              >
                <SelectTrigger className="h-8 bg-white border-zinc-300 text-xs text-zinc-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200 shadow-md">
                  {["HUMAN_ONLY", "AI_ASSIST", "AI_DRAFT", "AI_EXECUTE"].map(
                    (m) => (
                      <SelectItem
                        key={m}
                        value={m}
                        className="text-xs text-zinc-600"
                      >
                        {m}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Blocker reason */}
            {blockerFlag && (
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Blocker reason</Label>
                <Textarea
                  value={blockerReason}
                  onChange={(e) => setBlockerReason(e.target.value)}
                  className="text-xs bg-white border-zinc-300 text-zinc-600 focus-visible:ring-byred-red min-h-[60px]"
                  placeholder="Describe what is blocking this task..."
                />
              </div>
            )}

            <Button
              className="w-full bg-byred-red hover:bg-byred-red-hot text-white text-sm gap-2"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              <CheckCircle className="w-4 h-4" strokeWidth={1.75} />
              {saving ? "Saving…" : "Save"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
