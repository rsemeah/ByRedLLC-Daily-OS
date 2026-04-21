"use client"

import { useEffect, useState } from "react"
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
import { useUser } from "@/lib/context/user-context"
import { syncActiveTenantForMutation } from "@/lib/client/sync-active-tenant"
import { createTaskAction } from "@/lib/actions/tasks"
import type { TaskPriority } from "@/types/db"

const PRIORITIES: TaskPriority[] = ["critical", "high", "medium", "low"]

export default function NewTaskPage() {
  const router = useRouter()
  const { tenants, activeTenantId, setActiveTenantId } = useUser()
  const defaultTenantId = activeTenantId ?? tenants[0]?.id ?? ""
  const [loading, setLoading] = useState(false)

  const [tenantId, setTenantId] = useState("")

  useEffect(() => {
    setTenantId((prev) => (prev ? prev : defaultTenantId))
  }, [defaultTenantId])

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("medium")
  const [estimatedMinutes, setEstimatedMinutes] = useState("30")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || !title.trim()) {
      toast.error("Tenant and title are required.")
      return
    }
    setLoading(true)
    try {
      await syncActiveTenantForMutation(
        setActiveTenantId,
        activeTenantId,
        tenantId
      )
      const rawEst = estimatedMinutes.trim()
      const estParsed =
        rawEst === "" ? null : Number.parseInt(rawEst, 10)
      const est =
        estParsed != null && !Number.isNaN(estParsed) ? estParsed : null

      const result = await createTaskAction({
        tenantId,
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate.trim() || null,
        priority,
        estimatedMinutes: est,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Task created.")
      router.push(`/tasks/${result.data.id}`)
      router.refresh()
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
          Defaults to not started, human-only AI mode.
        </p>
      </div>

      <Card className="bg-white border-zinc-200 shadow-sm">
        <CardHeader className="pb-3">
          <p className="text-sm font-medium text-zinc-600">Task details</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tenant" className="text-xs text-zinc-500">
                Tenant <span className="text-byred-red">*</span>
              </Label>
              {tenants.length === 0 && (
                <p className="text-xs text-amber-700">
                  You don&apos;t have access to any tenants yet. Ask an admin to
                  add you to a workspace.
                </p>
              )}
              <Select
                value={tenantId}
                onValueChange={setTenantId}
                required
                disabled={tenants.length === 0}
              >
                <SelectTrigger
                  id="tenant"
                  className="bg-white border-zinc-300 text-zinc-600 text-sm focus-visible:ring-byred-red"
                >
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200 shadow-md">
                  {tenants.map((t) => (
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
                placeholder="Bind GL insurance — Paradise"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs text-zinc-500">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white border-zinc-300 text-zinc-700 placeholder:text-zinc-400 focus-visible:ring-byred-red min-h-[100px]"
                placeholder="Context, checklist, links…"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="due" className="text-xs text-zinc-500">
                  Due date
                </Label>
                <Input
                  id="due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-white border-zinc-300 text-zinc-700 focus-visible:ring-byred-red"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="est" className="text-xs text-zinc-500">
                  Est. minutes
                </Label>
                <Input
                  id="est"
                  type="number"
                  min={1}
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                  className="bg-white border-zinc-300 text-zinc-700 focus-visible:ring-byred-red"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TaskPriority)}
              >
                <SelectTrigger className="bg-white border-zinc-300 text-zinc-600 text-sm focus-visible:ring-byred-red">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-zinc-200 shadow-md">
                  {PRIORITIES.map((p) => (
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
