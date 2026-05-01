'use client'

import useSWR from 'swr'
import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { BoardWithData } from '@/types/kanban'
import { useBoardStore } from '@/hooks/useBoardStore'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function fetchBoard(url: string): Promise<BoardWithData> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch board')
  return res.json() as Promise<BoardWithData>
}

export function useBoard(boardId: string) {
  const { data, error, isLoading, mutate } = useSWR<BoardWithData>(
    boardId ? `/api/os/boards/${boardId}/kanban` : null,
    fetchBoard,
    { revalidateOnFocus: false }
  )

  const setBoard = useBoardStore((s) => s.setBoard)
  useEffect(() => {
    if (data && boardId) setBoard(boardId, data)
  }, [data, boardId, setBoard])

  useEffect(() => {
    if (!boardId) return
    const channel = supabase
      .channel(`board-${boardId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'byred_tasks',
        filter: `board_id=eq.${boardId}`,
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          useBoardStore.getState().updateTask(payload.new.id as string, payload.new)
        }
        if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
          mutate()
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [boardId, mutate])

  return { data, error, isLoading, mutate }
}
