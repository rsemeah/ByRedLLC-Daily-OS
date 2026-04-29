import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/os/calendar/projects?tenant_id=
// Returns active projects for entity linking in the calendar event form
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tenant_id = req.nextUrl.searchParams.get("tenant_id")
  if (!tenant_id) return NextResponse.json({ error: "tenant_id required" }, { status: 400 })

  const { data, error } = await supabase
    .from("os_projects")
    .select("id, name, status")
    .eq("tenant_id", tenant_id)
    .in("status", ["active", "paused"])
    .order("name", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [] })
}
