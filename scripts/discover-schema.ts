import { createClient } from "@supabase/supabase-js"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

type ColumnRow = {
  table_name: string
  column_name: string
  data_type: string
  is_nullable: "YES" | "NO"
  column_default: string | null
  udt_name: string
  ordinal_position: number
}

type TableSchema = {
  tableName: string
  columns: ColumnRow[]
}

const TARGET_TABLES = [
  "byred_tenants",
  "byred_users",
  "byred_user_tenants",
  "byred_tasks",
  "byred_leads",
  "byred_activities",
  "byred_daily_briefs",
] as const

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function toTypeScriptType(column: ColumnRow): string {
  const baseType = (() => {
    switch (column.udt_name) {
      case "uuid":
      case "text":
      case "varchar":
      case "bpchar":
      case "date":
      case "timestamp":
      case "timestamptz":
      case "time":
      case "timetz":
        return "string"
      case "bool":
        return "boolean"
      case "int2":
      case "int4":
      case "int8":
      case "float4":
      case "float8":
      case "numeric":
        return "number"
      case "json":
      case "jsonb":
        return "JsonValue"
      default:
        return "unknown"
    }
  })()

  return column.is_nullable === "YES" ? `${baseType} | null` : baseType
}

function toPascalCase(input: string): string {
  return input
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("")
}

function buildGeneratedTypes(schema: TableSchema[]): string {
  const lines: string[] = []

  lines.push("// Generated from live Supabase information_schema")
  lines.push("// Source: scripts/discover-schema.ts")
  lines.push("")
  lines.push("export type JsonValue =")
  lines.push("  | string")
  lines.push("  | number")
  lines.push("  | boolean")
  lines.push("  | null")
  lines.push("  | { [key: string]: JsonValue | undefined }")
  lines.push("  | JsonValue[]")
  lines.push("")

  for (const table of schema) {
    lines.push(`export type ${toPascalCase(table.tableName)}Discovered = {`)
    for (const column of table.columns) {
      lines.push(`  ${column.column_name}: ${toTypeScriptType(column)}`)
    }
    lines.push("}")
    lines.push("")
  }

  lines.push("export type DiscoveredSchema = {")
  for (const table of schema) {
    lines.push(`  ${table.tableName}: ${toPascalCase(table.tableName)}Discovered`)
  }
  lines.push("}")
  lines.push("")

  return lines.join("\n")
}

async function discoverSchema(): Promise<void> {
  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL")
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY")
  const projectRoot = process.cwd()
  const outputDir = join(projectRoot, "types")

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { data, error } = await supabase
    .from("information_schema.columns")
    .select("table_name,column_name,data_type,is_nullable,column_default,udt_name,ordinal_position")
    .eq("table_schema", "public")
    .in("table_name", [...TARGET_TABLES])
    .order("table_name", { ascending: true })
    .order("ordinal_position", { ascending: true })

  if (error) {
    throw new Error(`Schema discovery failed: ${error.message}`)
  }

  const rows = (data ?? []) as ColumnRow[]
  const grouped = new Map<string, ColumnRow[]>()

  for (const row of rows) {
    const existing = grouped.get(row.table_name) ?? []
    existing.push(row)
    grouped.set(row.table_name, existing)
  }

  const schema: TableSchema[] = TARGET_TABLES.map((tableName) => ({
    tableName,
    columns: grouped.get(tableName) ?? [],
  }))

  await mkdir(outputDir, { recursive: true })

  const generatedTypes = buildGeneratedTypes(schema)
  await writeFile(join(outputDir, "db.generated.ts"), generatedTypes, "utf8")
  await writeFile(join(outputDir, "schema.discovery.json"), JSON.stringify(schema, null, 2), "utf8")

  const foundTables = schema.filter((table) => table.columns.length > 0).length
  console.log(`Schema discovery complete. Found ${foundTables}/${TARGET_TABLES.length} tables.`)
}

discoverSchema().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error"
  console.error(`discover-schema failed: ${message}`)
  process.exit(1)
})
