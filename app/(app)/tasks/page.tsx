import { getTasks } from "@/lib/data/tasks"
import { TasksList } from "@/components/byred/tasks-list"

export default async function TasksPage() {
  const tasks = await getTasks()

  return <TasksList initialTasks={tasks} />
}
