'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { TaskWithMeta } from '@/types/kanban'

function priorityColor(priority: string): string {
  switch (priority) {
    case 'critical': return '#D7261E'
    case 'high': return '#F59E0B'
    case 'medium': return '#3B82F6'
    case 'low': return '#71717A'
    default: return '#3F3F46'
  }
}

export default function TaskCard({ task }: { task: TaskWithMeta }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderLeftColor: priorityColor(task.priority),
        opacity: isDragging ? 0.4 : 1,
      }}
      className="bg-[#18181B] rounded border-l-4 p-3 mb-2 cursor-grab select-none"
    >
      <p className="text-[#D4D4D8] text-xs font-medium line-clamp-2 leading-snug">
        {task.title}
      </p>
      <div className="flex items-center gap-2 mt-2">
        {task.blocker_flag && (
          <span className="text-[10px] font-bold text-[#D7261E] uppercase tracking-wide">
            Blocker
          </span>
        )}
        {task.due_date && (
          <span
            className="text-[10px] font-mono"
            style={{ color: task.isOverdue ? '#D7261E' : '#52525B' }}
          >
            {task.due_date}
          </span>
        )}
        {task.owner && (
          <span className="ml-auto text-[10px] text-[#52525B] truncate max-w-[80px]">
            {task.owner.name}
          </span>
        )}
      </div>
    </div>
  )
}
