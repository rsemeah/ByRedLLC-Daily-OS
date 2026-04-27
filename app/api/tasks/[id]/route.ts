import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { ByredTaskUpdate } from "@/types/database"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { data, error } = await supabase
    .from("byred_tasks")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data)
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = (await request.json()) as Partial<{
    title: string
    description: string | null
    status: string
    priority: string
    ai_mode: string
    due_date: string | null
    estimated_minutes: number
    blocker_flag: boolean
    blocker_reason: string | null
    owner_user_id: string | null
  }>

  const updateRow: ByredTaskUpdate = { ...body, updated_at: new Date().toISOString() }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("byred_tasks")
    .update(updateRow)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { error } = await supabase.from("byred_tasks").delete().eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
