import { notFound } from "next/navigation"
import { getTaskById } from "@/lib/data/tasks"
import { getActivitiesForObject } from "@/lib/data/activities"
import { TaskDetail } from "@/components/byred/task-detail"

interface TaskDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id } = await params

  const [task, activities] = await Promise.all([
    getTaskById(id),
    getActivitiesForObject("task", id),
  ])

  if (!task) {
    notFound()
  }

  const mondaySyncEnabled = Boolean(
    process.env.MONDAY_API_KEY?.trim() || process.env.MONDAY_TOKEN?.trim()
  )

  return (
    <TaskDetail
      task={task}
      activities={activities}
      mondaySyncEnabled={mondaySyncEnabled}
    />
  )
}
