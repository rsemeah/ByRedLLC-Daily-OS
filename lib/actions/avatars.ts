"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logger } from "@/lib/observability/logger"
import type { ActionResult } from "@/lib/actions/mutation-types"

const MAX_BYTES = 2 * 1024 * 1024 // 2 MB cap — avatars don't need more.
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
])
const BUCKET = "byred-avatars"

/**
 * Upload a profile picture for a specific byred_user. Permission model:
 *   - signed-in user may upload for their own byred_users row
 *   - an `admin`-role byred_user may upload for any row in their tenant scope
 *
 * Stores at `{byred_user_id}-{timestamp}.{ext}` so new uploads never collide
 * with the previous object's cache and `<Image>` sees a fresh URL. Returns
 * the public URL for the uploaded file.
 */
export async function uploadAvatarAction(input: {
  targetByredUserId: string
  fileName: string
  contentType: string
  dataBase64: string
}): Promise<ActionResult<{ avatarUrl: string }>> {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return { ok: false, error: "Not signed in." }
    }

    if (!ALLOWED_MIME.has(input.contentType)) {
      return {
        ok: false,
        error: `Unsupported file type: ${input.contentType}. Use PNG, JPEG, WebP, or GIF.`,
      }
    }

    const buffer = Buffer.from(input.dataBase64, "base64")
    if (buffer.length === 0) {
      return { ok: false, error: "Empty upload." }
    }
    if (buffer.length > MAX_BYTES) {
      return {
        ok: false,
        error: `File too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB).`,
      }
    }

    // Load the actor's byred_users row to check permission.
    const { data: actorRow, error: actorErr } = await supabase
      .from("byred_users")
      .select("id, role")
      .eq("auth_user_id", authUser.id)
      .maybeSingle()

    if (actorErr) {
      return { ok: false, error: actorErr.message }
    }
    if (!actorRow) {
      return { ok: false, error: "Your byred_users profile was not found." }
    }

    const actor = actorRow as { id: string; role: string }
    const isSelf = actor.id === input.targetByredUserId
    const isAdmin = actor.role === "admin"

    if (!isSelf && !isAdmin) {
      return { ok: false, error: "Only admins can change other users' avatars." }
    }

    const admin = createAdminClient()

    if (!isSelf) {
      const { data: actorMemberships, error: actorMembershipErr } = await supabase
        .from("byred_user_tenants")
        .select("tenant_id")
        .eq("user_id", actor.id)

      if (actorMembershipErr) {
        return { ok: false, error: actorMembershipErr.message }
      }

      const { data: targetRow, error: targetErr } = await admin
        .from("byred_users")
        .select("id")
        .eq("id", input.targetByredUserId)
        .maybeSingle()

      if (targetErr || !targetRow) {
        return {
          ok: false,
          error: targetErr?.message ?? "Target user was not found.",
        }
      }

      const { data: targetMemberships, error: targetMembershipErr } = await admin
        .from("byred_user_tenants")
        .select("tenant_id")
        .eq("user_id", input.targetByredUserId)

      if (targetMembershipErr) {
        return { ok: false, error: targetMembershipErr.message }
      }

      const actorTenantIds = new Set(
        ((actorMemberships ?? []) as Array<{ tenant_id: string | null }>)
          .map((row) => row.tenant_id)
          .filter((tenantId): tenantId is string => Boolean(tenantId))
      )
      const sharesTenant = (
        (targetMemberships ?? []) as Array<{ tenant_id: string | null }>
      ).some((row) => row.tenant_id && actorTenantIds.has(row.tenant_id))

      if (!sharesTenant) {
        return {
          ok: false,
          error: "Admins can only change avatars for users in their tenant scope.",
        }
      }
    }

    // Use the admin client for the actual upload so we can bypass RLS on the
    // `byred_users.update` path when an admin is acting on a Monday-imported
    // row (no peer tenant, so the RLS UPDATE policy would otherwise deny).
    const ext = extFromMime(input.contentType)
    const objectPath = `${input.targetByredUserId}/${Date.now()}.${ext}`

    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(objectPath, buffer, {
        contentType: input.contentType,
        upsert: true,
      })

    if (uploadErr) {
      return { ok: false, error: `upload failed: ${uploadErr.message}` }
    }

    const {
      data: { publicUrl },
    } = admin.storage.from(BUCKET).getPublicUrl(objectPath)

    const { error: updateErr } = await admin
      .from("byred_users")
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() } as never)
      .eq("id", input.targetByredUserId)

    if (updateErr) {
      return { ok: false, error: updateErr.message }
    }

    logger.info("avatar.uploaded", {
      actor_id: actor.id,
      target_id: input.targetByredUserId,
      size_bytes: buffer.length,
    })

    // Revalidate any surface that renders the avatar.
    revalidatePath("/", "layout")
    revalidatePath("/tasks")
    revalidatePath("/settings")

    return { ok: true, data: { avatarUrl: publicUrl } }
  } catch (e) {
    logger.error(
      "avatar.upload_exception",
      { target_id: input.targetByredUserId },
      e
    )
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Avatar upload failed.",
    }
  }
}

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png"
    case "image/jpeg":
      return "jpg"
    case "image/webp":
      return "webp"
    case "image/gif":
      return "gif"
    default:
      return "bin"
  }
}
