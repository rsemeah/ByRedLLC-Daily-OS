import { randomBytes } from "node:crypto"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { User } from "@supabase/supabase-js"
import type { Database } from "../types/database"

function createSeedAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url) {
    throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL")
  }
  if (!key) {
    throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY")
  }
  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

type SeedUserConfig = {
  key: "KP" | "RORY"
  fullName: string
  email: string
}

function requiredEnv(name: "BYRED_KP_EMAIL" | "BYRED_RORY_EMAIL"): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function generatePassword(): string {
  return `ByRed!${randomBytes(6).toString("hex")}`
}

async function findAuthUserByEmail(
  adminClient: SupabaseClient<Database>,
  email: string
): Promise<User | null> {
  const target = email.trim().toLowerCase()
  const perPage = 200

  for (let page = 1; page < 500; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`)
    }
    const users = data.users ?? []
    const hit = users.find((u) => {
      if ((u.email ?? "").toLowerCase() === target) return true
      for (const id of u.identities ?? []) {
        const e = (id.identity_data as { email?: string } | undefined)?.email
        if (e && e.toLowerCase() === target) return true
      }
      return false
    })
    if (hit) return hit
    if (users.length < perPage) break
  }

  return null
}

async function ensureAuthUser(
  adminClient: SupabaseClient<Database>,
  config: SeedUserConfig
): Promise<{ authUserId: string; generatedPassword: string | null; created: boolean }> {
  const existing = await findAuthUserByEmail(adminClient, config.email)
  if (existing?.id) {
    return { authUserId: existing.id, generatedPassword: null, created: false }
  }

  const password = generatePassword()
  const { data, error } = await adminClient.auth.admin.createUser({
    email: config.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: config.fullName,
      // byred_bootstrap_user_from_auth: skip personal tenant; see migration 20260421170000
      byred_skip_bootstrap: "true",
    },
  })

  if (error || !data.user?.id) {
    let raceHit = await findAuthUserByEmail(adminClient, config.email)
    if (!raceHit?.id && /already|registered|exists/i.test(String(error?.message))) {
      await new Promise((r) => setTimeout(r, 400))
      raceHit = await findAuthUserByEmail(adminClient, config.email)
    }
    if (raceHit?.id) {
      return { authUserId: raceHit.id, generatedPassword: null, created: false }
    }
    throw new Error(
      `Failed to create auth user for ${config.email}: ${error?.message ?? "No auth user returned"}`
    )
  }

  return { authUserId: data.user.id, generatedPassword: password, created: true }
}

async function ensureByredUser(
  adminClient: SupabaseClient<Database>,
  config: SeedUserConfig,
  authUserId: string
): Promise<string> {
  const email = config.email.trim().toLowerCase()

  const { data: byAuth, error: byAuthErr } = await adminClient
    .from("byred_users")
    .select("id, auth_user_id, email")
    .eq("auth_user_id", authUserId)
    .maybeSingle()

  if (byAuthErr) {
    throw new Error(`Failed to query byred_users by auth_user_id: ${byAuthErr.message}`)
  }

  if (byAuth?.id) {
    if (byAuth.id === authUserId) {
      const { error: updateErr } = await adminClient
        .from("byred_users")
        .update({
          email,
          name: config.fullName,
          role: "admin",
          active: true,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", byAuth.id)
      if (updateErr) {
        throw new Error(`Failed to update existing byred_users row: ${updateErr.message}`)
      }
      return byAuth.id
    }
    // Legacy: id != auth_user_id — replace row so id and auth match (dev/staging)
    const { error: delUt } = await adminClient.from("byred_user_tenants").delete().eq("user_id", byAuth.id)
    if (delUt) {
      throw new Error(`Failed to clear memberships for byred user: ${delUt.message}`)
    }
    const { error: delU } = await adminClient.from("byred_users").delete().eq("id", byAuth.id)
    if (delU) {
      throw new Error(`Failed to remove legacy byred_users row: ${delU.message}`)
    }
  }

  const { data: byEmailRows, error: byEmailErr } = await adminClient
    .from("byred_users")
    .select("id, auth_user_id")
    .eq("email", email)
    .limit(2)

  if (byEmailErr) {
    throw new Error(`Failed to query byred_users by email: ${byEmailErr.message}`)
  }

  const byEmail = byEmailRows ?? []
  if (byEmail.length > 1) {
    throw new Error(`Multiple byred_users rows found for ${email}. Resolve duplicates before seeding.`)
  }

  if (byEmail.length === 1) {
    const row = byEmail[0]
    const existingAuth = row.auth_user_id?.trim() ?? null
    if (existingAuth && existingAuth !== authUserId) {
      throw new Error(
        `Email ${email} is linked to a different auth_user_id (${existingAuth}). Manual fix required.`
      )
    }
    if (row.id === authUserId) {
      const { error: relinkErr } = await adminClient
        .from("byred_users")
        .update({
          auth_user_id: authUserId,
          name: config.fullName,
          role: "admin",
          active: true,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", row.id)
      if (relinkErr) {
        throw new Error(`Failed to relink existing byred_users row: ${relinkErr.message}`)
      }
      return row.id
    }
    // Legacy row where id was not auth id: remove and insert id = auth (clean dev)
    const { error: delUt } = await adminClient.from("byred_user_tenants").delete().eq("user_id", row.id)
    if (delUt) {
      throw new Error(`Failed to clear memberships for stale byred user id: ${delUt.message}`)
    }
    const { error: delU } = await adminClient.from("byred_users").delete().eq("id", row.id)
    if (delU) {
      throw new Error(`Failed to remove stale byred_users row: ${delU.message}`)
    }
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(authUserId)) {
    throw new Error(
      `Invalid auth_user_id (expected UUID) for ${config.email}. Got: ${JSON.stringify(authUserId)}`
    )
  }

  const { data: created, error: insertErr } = await adminClient
    .from("byred_users")
    .insert({
      id: authUserId,
      auth_user_id: authUserId,
      email,
      name: config.fullName,
      role: "admin",
      active: true,
    } as never)
    .select("id")
    .single()

  if (insertErr || !created) {
    if (insertErr) {
      console.error("byred_users insert error (raw):", insertErr)
    }
    throw new Error(
      `Failed to create byred_users row for ${config.email}: ${insertErr?.message ?? "Unknown profile insert error"} (code: ${(insertErr as { code?: string } | null)?.code ?? "n/a"})`
    )
  }

  return created.id
}

async function ensureTenantMemberships(
  adminClient: SupabaseClient<Database>,
  byredUserId: string,
  tenantIds: string[]
): Promise<void> {
  const { data: existingRows, error: existingErr } = await adminClient
    .from("byred_user_tenants")
    .select("id, tenant_id, role")
    .eq("user_id", byredUserId)
    .in("tenant_id", tenantIds)

  if (existingErr) {
    throw new Error(`Failed to load existing memberships: ${existingErr.message}`)
  }

  const existing = new Map(
    (existingRows ?? []).map((row) => [row.tenant_id, { id: row.id, role: row.role }])
  )

  const missing = tenantIds.filter((tenantId) => !existing.has(tenantId))
  if (missing.length > 0) {
    const payload = missing.map((tenantId) => ({
      user_id: byredUserId,
      tenant_id: tenantId,
      role: "admin",
    }))
    const { error: insErr } = await adminClient
      .from("byred_user_tenants")
      .insert(payload as never)
    if (insErr) {
      throw new Error(`Failed to insert missing memberships: ${insErr.message}`)
    }
  }

  const nonAdmin = [...existing.values()].filter((row) => row.role !== "admin")
  if (nonAdmin.length > 0) {
    const ids = nonAdmin.map((r) => r.id)
    const { error: upErr } = await adminClient
      .from("byred_user_tenants")
      .update({ role: "admin" } as never)
      .in("id", ids)
    if (upErr) {
      throw new Error(`Failed to promote existing memberships to admin: ${upErr.message}`)
    }
  }
}

async function main(): Promise<void> {
  const adminClient = createSeedAdminClient()

  const users: SeedUserConfig[] = [
    {
      key: "KP",
      fullName: "Keymon Penn",
      email: requiredEnv("BYRED_KP_EMAIL"),
    },
    {
      key: "RORY",
      fullName: "Rory Semeah",
      email: requiredEnv("BYRED_RORY_EMAIL"),
    },
  ]

  const { data: tenants, error: tenantError } = await adminClient
    .from("byred_tenants")
    .select("id, name")
    .eq("active", true)

  if (tenantError) {
    throw new Error(`Failed to load active tenants: ${tenantError.message}`)
  }

  if (!tenants || tenants.length === 0) {
    throw new Error("No active tenants found. Seed tenants first.")
  }

  const tenantIds = tenants.map((t) => t.id)
  console.log(
    `Active tenants (${tenantIds.length}): ${tenants
      .map((t) => t.name)
      .sort()
      .join(", ")}`
  )

  const createdCredentials: Array<{ email: string; password: string }> = []
  const reusedAuthUsers: string[] = []

  for (const userConfig of users) {
    const auth = await ensureAuthUser(adminClient, userConfig)
    if (auth.created && auth.generatedPassword) {
      createdCredentials.push({
        email: userConfig.email.toLowerCase(),
        password: auth.generatedPassword,
      })
    } else {
      reusedAuthUsers.push(userConfig.email.toLowerCase())
    }

    const byredUserId = await ensureByredUser(adminClient, userConfig, auth.authUserId)
    await ensureTenantMemberships(adminClient, byredUserId, tenantIds)
    console.log(`OK ${userConfig.email.toLowerCase()} (auth ${auth.created ? "created" : "reused"})`)
  }

  console.log("")
  console.log("Seed complete.")
  if (createdCredentials.length > 0) {
    console.log("New auth credentials (store securely):")
    for (const credential of createdCredentials) {
      console.log(`- ${credential.email} / ${credential.password}`)
    }
  } else {
    console.log("No new auth users were created.")
  }
  if (reusedAuthUsers.length > 0) {
    console.log("Existing auth users reused:")
    for (const email of reusedAuthUsers) {
      console.log(`- ${email}`)
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error"
  console.error(`seed-users failed: ${message}`)
  process.exit(1)
})
