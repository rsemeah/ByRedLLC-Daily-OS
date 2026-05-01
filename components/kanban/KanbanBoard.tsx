'use client'

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useBoard } from '@/hooks/useBoard'
import { useBoardStore } from '@/hooks/useBoardStore'
import KanbanColumn from './KanbanColumn'

async function patchTask(taskId: string, patch: Record<string, unknown>) {
  await fetch(`/api/os/tasks/${taskId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
}

export default function KanbanBoard({ boardId }: { boardId: string }) {
  const { data, isLoading, error } = useBoard(boardId)
  const moveTask = useBoardStore((s) => s.moveTask)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || !data) return
    const taskId = active.id as string
    const toPhaseId = over.id as string
    if (toPhaseId === over.id) {
      moveTask(taskId, toPhaseId, 0)
      await patchTask(taskId, { phase_id: toPhaseId })
    }
  }

  if (isLoading) {
    return (
      <div style={{ padding: 40, color: '#52525B', fontSize: 13 }}>Loading board…</div>
    )
  }
  if (error || !data) {
    return (
      <div style={{ padding: 40, color: '#D7261E', fontSize: 13 }}>Board not found.</div>
    )
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 28px 40px', alignItems: 'flex-start' }}>
        {data.phases.map((phase) => (
          <KanbanColumn
            key={phase.id}
            phase={phase}
            tasks={data.tasksByPhase[phase.id] ?? []}
          />
        ))}
        {data.phases.length === 0 && (
          <div style={{ color: '#3F3F46', fontSize: 13, paddingTop: 40 }}>
            No phases yet. Add phases from the board settings.
          </div>
        )}
      </div>
    </DndContext>
  )
}
