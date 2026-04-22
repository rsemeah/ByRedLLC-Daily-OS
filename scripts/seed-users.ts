import { randomBytes } from "node:crypto"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
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

async function ensureUser(
  adminClient: SupabaseClient<Database>,
  config: SeedUserConfig
): Promise<{ byredUserId: string; email: string; password: string }> {
  const password = generatePassword()

  const { data: createdAuth, error: authError } = await adminClient.auth.admin.createUser({
    email: config.email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: config.fullName,
    },
  })

  if (authError) {
    throw new Error(`Failed to create auth user for ${config.email}: ${authError.message}`)
  }

  const authUserId = createdAuth.user.id
  const { data: byredUser, error: profileError } = await adminClient
    .from("byred_users")
    .insert({
      auth_user_id: authUserId,
      email: config.email,
      name: config.fullName,
      role: "admin",
      active: true,
    })
    .select("id")
    .single()

  if (profileError || !byredUser) {
    throw new Error(
      `Failed to create byred_users row for ${config.email}: ${
        profileError?.message ?? "Unknown profile insert error"
      }`
    )
  }

  return {
    byredUserId: byredUser.id,
    email: config.email,
    password,
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
    .select("id")
    .eq("active", true)

  if (tenantError) {
    throw new Error(`Failed to load active tenants: ${tenantError.message}`)
  }

  if (!tenants || tenants.length === 0) {
    throw new Error("No active tenants found. Seed tenants first.")
  }

  const credentials: Array<{ email: string; password: string }> = []

  for (const userConfig of users) {
    const user = await ensureUser(adminClient, userConfig)
    credentials.push({ email: user.email, password: user.password })

    const memberships = tenants.map((tenant) => ({
      user_id: user.byredUserId,
      tenant_id: tenant.id,
      role: "admin",
    }))

    const { error: membershipError } = await adminClient
      .from("byred_user_tenants")
      .insert(memberships)

    if (membershipError) {
      throw new Error(
        `Failed to create tenant memberships for ${user.email}: ${membershipError.message}`
      )
    }
  }

  console.log("Seed complete. Store these credentials securely:")
  credentials.forEach((credential) => {
    console.log(`- ${credential.email} / ${credential.password}`)
  })
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error"
  console.error(`seed-users failed: ${message}`)
  process.exit(1)
})
