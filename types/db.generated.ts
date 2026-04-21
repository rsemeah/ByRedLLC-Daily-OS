// Live schema generation is currently blocked because the configured
// `SUPABASE_SERVICE_ROLE_KEY` is not a secret key and Supabase CLI is not
// authenticated with a `SUPABASE_ACCESS_TOKEN`.
//
// This file intentionally mirrors existing local database types as a fallback
// to keep the project type-safe until live generation is unblocked.
export type { Database } from "./database"
export type {
  ByredTenant,
  ByredTenantInsert,
  ByredTenantUpdate,
  ByredUser,
  ByredUserInsert,
  ByredUserUpdate,
  ByredUserTenant,
  ByredUserTenantInsert,
  ByredUserTenantUpdate,
  ByredTask,
  ByredTaskInsert,
  ByredTaskUpdate,
  ByredLead,
  ByredLeadInsert,
  ByredLeadUpdate,
  ByredActivity,
  ByredActivityInsert,
  ByredActivityUpdate,
  ByredDailyBrief,
  ByredDailyBriefInsert,
  ByredDailyBriefUpdate,
} from "./database"
