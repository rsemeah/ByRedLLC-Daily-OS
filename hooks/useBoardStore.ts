import { create } from 'zustand'
import type { BoardWithData, TaskWithMeta } from '@/types/kanban'

type State = {
  boards: Record<string, BoardWithData>
  isLoading: boolean
  error: string | null
}

type Actions = {
  setBoard: (boardId: string, data: BoardWithData) => void
  updateTask: (taskId: string, patch: Partial<TaskWithMeta>) => void
  moveTask: (taskId: string, toPhaseId: string, newOrderIndex: number) => void
}

export const useBoardStore = create<State & Actions>((set, get) => ({
  boards: {},
  isLoading: false,
  error: null,
  setBoard: (boardId, data) => set((s) => ({ boards: { ...s.boards, [boardId]: data } })),
  updateTask: (taskId, patch) => {
    const boards = { ...get().boards }
    for (const boardId in boards) {
      for (const phaseId in boards[boardId].tasksByPhase) {
        boards[boardId].tasksByPhase[phaseId] = boards[boardId].tasksByPhase[phaseId].map((t) =>
          t.id === taskId ? { ...t, ...patch } : t
        )
      }
    }
    set({ boards })
  },
  moveTask: (_taskId, _toPhaseId, _newOrderIndex) => {
    // Optimistic update — implemented in KanbanBoard drag handler
  },
}))
