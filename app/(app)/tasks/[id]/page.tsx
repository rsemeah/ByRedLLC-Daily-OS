import { notFound } from "next/navigation"
import { getTaskById } from "@/lib/data/tasks"
import { getActivitiesForObject } from "@/lib/data/activities"
import { TaskDetail } from "@/components/byred/task-detail"
import { mondayApiTokenConfigured } from "@/lib/monday/integration"

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

  /** Push/pull use MONDAY_API_KEY; default board from MONDAY_BOARD_ID (see /integrations/monday). */
  const mondaySyncEnabled = mondayApiTokenConfigured()

  return (
    <TaskDetail
      task={task}
      activities={activities}
      mondaySyncEnabled={mondaySyncEnabled}
    />
  )
}
