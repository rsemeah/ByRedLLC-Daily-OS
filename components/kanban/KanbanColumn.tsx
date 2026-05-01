'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { OsPhase, TaskWithMeta } from '@/types/kanban'
import TaskCard from './TaskCard'

export default function KanbanColumn({
  phase,
  tasks,
}: {
  phase: OsPhase
  tasks: TaskWithMeta[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: phase.id })

  return (
    <div
      style={{ minWidth: 260, maxWidth: 320 }}
      className="flex flex-col rounded-lg overflow-hidden border border-[rgba(255,255,255,0.07)]"
    >
      {/* Column header */}
      <div
        style={{
          borderTopWidth: 3,
          borderTopColor: phase.color ?? '#3F3F46',
          background: '#18181B',
          padding: '10px 14px',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[#FAFAFA] text-xs font-bold uppercase tracking-widest">
            {phase.name}
          </span>
          <span className="text-[10px] text-[#52525B] font-mono">{tasks.length}</span>
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        style={{
          background: isOver ? 'rgba(215,38,30,0.04)' : '#0F0F10',
          flex: 1,
          padding: '8px 8px 4px',
          minHeight: 120,
          maxHeight: 'calc(100vh - 200px)',
          overflowY: 'auto',
        }}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-20 border border-dashed border-[rgba(255,255,255,0.07)] rounded text-[#3F3F46] text-xs">
              Drop here
            </div>
          ) : (
            tasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </SortableContext>
      </div>
    </div>
  )
}
