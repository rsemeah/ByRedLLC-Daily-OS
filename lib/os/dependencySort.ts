import type { Task } from '@/types/db'

type DepEdge = { task_id: string; depends_on_task_id: string }

/**
 * Kahn's topological sort. Returns tasks ordered so every dependency
 * appears before the task that depends on it. Tasks not in the graph
 * are appended at the end in their original order.
 */
export function topologicalSort(tasks: Task[], deps: DepEdge[]): Task[] {
  const ids = new Set(tasks.map((t) => t.id))
  const byId = new Map(tasks.map((t) => [t.id, t]))

  // Build adjacency: depends_on → [dependents]
  const children = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  for (const t of tasks) {
    if (!children.has(t.id)) children.set(t.id, [])
    if (!inDegree.has(t.id)) inDegree.set(t.id, 0)
  }

  for (const { task_id, depends_on_task_id } of deps) {
    if (!ids.has(task_id) || !ids.has(depends_on_task_id)) continue
    children.get(depends_on_task_id)!.push(task_id)
    inDegree.set(task_id, (inDegree.get(task_id) ?? 0) + 1)
  }

  const queue = tasks.filter((t) => (inDegree.get(t.id) ?? 0) === 0).map((t) => t.id)
  const result: Task[] = []

  while (queue.length > 0) {
    const id = queue.shift()!
    const task = byId.get(id)
    if (task) result.push(task)

    for (const childId of children.get(id) ?? []) {
      const deg = (inDegree.get(childId) ?? 1) - 1
      inDegree.set(childId, deg)
      if (deg === 0) queue.push(childId)
    }
  }

  // Append any remaining tasks (cycle members or orphans not in deps)
  const seen = new Set(result.map((t) => t.id))
  for (const t of tasks) {
    if (!seen.has(t.id)) result.push(t)
  }

  return result
}

/**
 * Assign sequential order_index values starting from 1 based on
 * topological sort order.
 */
export function assignOrderIndexes(
  tasks: Task[],
  deps: DepEdge[],
): Array<{ id: string; order_index: number }> {
  return topologicalSort(tasks, deps).map((t, i) => ({ id: t.id, order_index: i + 1 }))
}
