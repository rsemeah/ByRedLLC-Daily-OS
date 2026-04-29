"use client"

import { Users, ExternalLink, CheckSquare, Building2 } from "lucide-react"
import { MOCK_TEAM } from "@/components/byred/os/mock-data"
import { OSAvatar } from "@/components/byred/os/os-avatar"

const ROLE_MAP: Record<string, string> = {
  admin: "Administrator",
  member: "Member",
  viewer: "Viewer",
}

export default function OSTeamPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white font-condensed tracking-tight">Team</h1>
        <p className="text-sm text-zinc-500 mt-1">{MOCK_TEAM.length} active members</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_TEAM.map((member) => (
          <div
            key={member.id}
            className="rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors p-5"
          >
            <div className="flex items-start gap-3 mb-4">
              <OSAvatar name={member.name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{member.name}</p>
                <p className="text-xs text-zinc-500 truncate">{member.email}</p>
                <span className="inline-block mt-1.5 text-[10px] font-medium text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded capitalize">
                  {ROLE_MAP[member.role] ?? member.role}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-zinc-800">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <CheckSquare className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
                <span>{member.task_count} active tasks</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Building2 className="w-3.5 h-3.5 text-zinc-600" strokeWidth={1.75} />
                <span>{member.tenant_count} tenants</span>
              </div>
              {member.monday_user_id && (
                <div className="flex items-center gap-2 text-xs text-zinc-600">
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-700" strokeWidth={1.75} />
                  <span>Monday ID: {member.monday_user_id}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
