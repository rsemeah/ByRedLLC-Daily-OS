"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Upload, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OwnerAvatar } from "@/components/byred/owner-avatar"
import { uploadAvatarAction } from "@/lib/actions/avatars"

type Member = {
  id: string
  name: string
  email: string
  role: string
  source: string
  avatar_url: string | null
  isLinked: boolean
  isMe: boolean
}

const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"])

function toBase64(buffer: ArrayBuffer): string {
  // ArrayBuffer → base64 without blowing the call stack on a 2 MB file.
  const bytes = new Uint8Array(buffer)
  let binary = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function TeamRoster({
  users,
  isAdmin,
}: {
  users: Member[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  async function handleFile(member: Member, file: File) {
    if (!ALLOWED.has(file.type)) {
      toast.error(`${file.type} not supported. Use PNG, JPEG, WebP, or GIF.`)
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error(`File too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB).`)
      return
    }

    setUploadingId(member.id)
    try {
      const buffer = await file.arrayBuffer()
      const dataBase64 = toBase64(buffer)
      const res = await uploadAvatarAction({
        targetByredUserId: member.id,
        fileName: file.name,
        contentType: file.type,
        dataBase64,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(`Avatar updated for ${member.name}.`)
      startTransition(() => router.refresh())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.")
    } finally {
      setUploadingId(null)
    }
  }

  return (
    <div className="rounded-md border border-zinc-200 overflow-hidden bg-white">
      <ul role="list" className="divide-y divide-zinc-100">
        {users.map((m) => {
          const canEdit = m.isMe || isAdmin
          const busy = uploadingId === m.id
          const inputId = `avatar-upload-${m.id}`

          return (
            <li
              key={m.id}
              className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-50/80"
            >
              <OwnerAvatar ownerId={null} size="lg" user={m} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate flex items-center gap-2">
                  {m.name || m.email}
                  {m.isMe && (
                    <span className="text-[10px] uppercase tracking-wide text-byred-red border border-byred-red/30 rounded px-1.5 py-0 font-semibold">
                      You
                    </span>
                  )}
                  {m.role === "admin" && (
                    <span className="text-[10px] uppercase tracking-wide text-zinc-500 border border-zinc-300 rounded px-1.5 py-0">
                      Admin
                    </span>
                  )}
                  {m.source === "monday_import" && (
                    <span
                      className="text-[10px] uppercase tracking-wide text-amber-700 border border-amber-300 rounded px-1.5 py-0"
                      title="Imported from Monday — no app login yet"
                    >
                      Monday
                    </span>
                  )}
                </p>
                <p className="text-xs text-zinc-500 truncate">{m.email}</p>
              </div>
              {canEdit ? (
                <>
                  <input
                    id={inputId}
                    type="file"
                    accept={[...ALLOWED].join(",")}
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleFile(m, file)
                      e.target.value = ""
                    }}
                    disabled={busy}
                  />
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={busy}
                  >
                    <label htmlFor={inputId} className="cursor-pointer">
                      {busy ? (
                        <>
                          <Check className="w-3.5 h-3.5 animate-pulse" strokeWidth={1.75} />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" strokeWidth={1.75} />
                          {m.avatar_url ? "Replace" : "Upload"}
                        </>
                      )}
                    </label>
                  </Button>
                </>
              ) : (
                <span className="text-xs text-zinc-400">view only</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
