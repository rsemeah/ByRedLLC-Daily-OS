import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ChevronLeft, Users } from "lucide-react"
import { TeamRoster } from "./team-roster"

export const dynamic = "force-dynamic"

type Row = {
  id: string
  name: string
  email: string
  role: string | null
  active: boolean | null
  avatar_url: string | null
  source: string | null
  monday_user_id: string | null
  auth_user_id: string | null
}

/**
 * Team roster + per-user avatar upload.
 *
 * Permission model (client-side UX matches the server action):
 *   - any signed-in user may upload their own avatar
 *   - role='admin' byred_users may upload for anyone in the list
 *
 * Read path goes through the RLS-scoped server client, so the list already
 * reflects what the current user can see (tenant peers + Monday-imported
 * roster rows).
 */
export default async function TeamSettingsPage() {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) redirect("/login")

  const { data: meRow } = await supabase
    .from("byred_users")
    .select("id, role")
    .eq("auth_user_id", authUser.id)
    .maybeSingle()

  const me = (meRow ?? null) as { id: string; role: string } | null
  const isAdmin = me?.role === "admin"

  const { data: rows } = await supabase
    .from("byred_users")
    .select(
      "id, name, email, role, active, avatar_url, source, monday_user_id, auth_user_id"
    )
    .eq("active", true)
    .order("name", { ascending: true })

  const users = ((rows ?? []) as Row[]).map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role ?? "member",
    source: r.source ?? "auth",
    avatar_url: r.avatar_url,
    isLinked: !!r.auth_user_id,
    isMe: me?.id === r.id,
  }))

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start gap-3">
        <Link
          href="/settings"
          className="mt-1 text-xs text-zinc-500 hover:text-zinc-800 inline-flex items-center gap-1"
        >
          <ChevronLeft className="h-3 w-3" strokeWidth={1.75} />
          Settings
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="rounded-md border border-zinc-200 bg-white p-2">
          <Users className="h-5 w-5 text-byred-red" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-condensed font-bold text-zinc-900 tracking-tight">
            Team
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {users.length} {users.length === 1 ? "person" : "people"} ·{" "}
            {isAdmin
              ? "as admin, you can upload avatars for anyone"
              : "you can upload your own avatar"}
          </p>
        </div>
      </div>

      <TeamRoster users={users} isAdmin={isAdmin} />
    </div>
  )
}
