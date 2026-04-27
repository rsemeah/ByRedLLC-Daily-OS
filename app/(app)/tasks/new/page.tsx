"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { TENANT_NAMES } from "@/lib/tenant-colors"

const TENANT_OPTIONS = Object.entries(TENANT_NAMES).map(([id, name]) => ({
  id,
  name,
}))

export default function NewTaskPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [tenantId, setTenantId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState("not_started")
  const [priority, setPriority] = useState("medium")
  const [aiMode, setAiMode] = useState("HUMAN_ONLY")
  const [dueDate, setDueDate] = useState("")
  const [estimatedMinutes, setEstimatedMinutes] = useState("30")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || !title.trim()) {
      toast.error("Tenant and title are required.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description || null,
          status,
          priority,
          ai_mode: aiMode,
          tenant_id: tenantId,
          due_date: dueDate || null,
          estimated_minutes: parseInt(estimatedMinutes, 10) || 30,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create task.")
        return
      }
      toast.success("Task created.")
      router.push(`/tasks/${data.id}`)
    } catch {
      toast.error("Failed to create task.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <nav
        className="flex items-center gap-1.5 text-xs text-zinc-400"
        aria-label="Breadcrumb"
      >
        <Link href="/tasks" className="hover:text-zinc-700 transition-colors">
          Tasks
        </Link>
        <ChevronRight className="w-3 h-3" strokeWidth={1.75} />
        <span className="text-zinc-500">New task</span>
      </nav>

      <div>
        <h1 className="text-3xl font-condensed font-bold text-zinc-900 tracking-tight">
          New task
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Status defaults to not started.
        </p>
      </div>

      <Card className="bg-white border-zinc-200 shadow-sm">
        <CardHeader className="pb-3">
          <p className="text-sm font-medium text-zinc-600">Task details</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tenant */}
            <div className="space-y-1.5">
              <Label htmlFor="tenant" className="text-xs text-zinc-500">
                Tenant <span className="text-byred-red">*</span>
              </Label>
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger
                  id="tenant"
                  className="bg-white border-zinc-300 text-zinc-600 text-sm focus-visible:ring-byred-red"
                >
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200 shadow-md">
                  {TENANT_OPTIONS.map((t) => (
                    <SelectItem
                      key={t.id}
                      value={t.id}
                      className="text-zinc-600 text-sm"
                    >
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs text-zinc-500">
                Title <span className="text-byred-red">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="bg-white border-zinc-300 text-zinc-700 placeholder:text-zinc-400 focus-visible:ring-byred-red"
                placeholder="What needs to get done?"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs text-zinc-500">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white border-zinc-300 text-zinc-700 placeholder:text-zinc-400 focus-visible:ring-byred-red min-h-[80px]"
                placeholder="Context, steps, acceptance criteria…"
              />
            </div>

            {/* Status + Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="bg-white border-zinc-300 text-zinc-600 text-sm focus-visible:ring-byred-red">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-zinc-200 shadow-md">
                    {["not_started", "in_progress", "done", "blocked"].map(
                      (s) => (
                        <SelectItem
                          key={s}
                          value={s}
                          className="text-zinc-600 text-sm capitalize"
                        >
                          {s.replace("_", " ")}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="bg-white border-zinc-300 text-zinc-600 text-sm focus-visible:ring-byred-red">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-zinc-200 shadow-md">
                    {["critical", "high", "medium", "low"].map((p) => (
                      <SelectItem
                        key={p}
                        value={p}
                        className="text-zinc-600 text-sm capitalize"
                      >
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* AI Mode */}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">AI Mode</Label>
              <Select value={aiMode} onValueChange={setAiMode}>
                <SelectTrigger className="bg-white border-zinc-300 text-zinc-600 text-sm focus-visible:ring-byred-red">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200 shadow-md">
                  {["HUMAN_ONLY", "AI_ASSIST", "AI_DRAFT", "AI_EXECUTE"].map(
                    (m) => (
                      <SelectItem
                        key={m}
                        value={m}
                        className="text-zinc-600 text-sm"
                      >
                        {m}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Due date + Estimated minutes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="due_date" className="text-xs text-zinc-500">
                  Due date
                </Label>
                <Input
                  id="due_date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-white border-zinc-300 text-zinc-700 focus-visible:ring-byred-red"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="estimated" className="text-xs text-zinc-500">
                  Estimated (min)
                </Label>
                <Input
                  id="estimated"
                  type="number"
                  min="5"
                  step="5"
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  className="bg-white border-zinc-300 text-zinc-700 focus-visible:ring-byred-red"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="bg-byred-red hover:bg-byred-red-hot text-white"
              >
                {loading ? "Creating…" : "Create task"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-zinc-500 hover:text-zinc-700"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
