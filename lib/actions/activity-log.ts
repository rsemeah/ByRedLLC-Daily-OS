import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"

export type ActivityInsert = Database["public"]["Tables"]["byred_activities"]["Insert"]

export async function insertActivityRow(
  row: ActivityInsert
): Promise<{ error: Error | null }> {
  const supabase = await createClient()
  const { error } = await supabase.from("byred_activities").insert(row as never)
  if (error) {
    return { error: new Error(error.message) }
  }
  return { error: null }
}
