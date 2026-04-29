# ByRed OS — v0 Alignment Prompt

**Last updated:** 2026-04-29
**Repo:** byredllc-daily-os
**Stack:** Next.js 15 App Router · React 19 · TypeScript · Tailwind v4 · Supabase (SSR) · shadcn/ui

This is a private, allowlist-gated internal operations platform for By Red, LLC. It is NOT a SaaS product.

---

## Critical: Two Separate Shells

The app has **two completely independent visual shells** that must never be mixed.

### Shell 1 — App shell (`(app)/`)

Light mode, white sidebar, existing business routes.

### Shell 2 — OS shell (`os/`)

Dark mode, dark sidebar, new OS routes. **All new OS work goes here.**

---

## Shell 2: OS Shell (the active build)

### Visual Design Tokens

```text
bg-base:      #111112   (page background — the darkest layer)
bg-card:      #18181B   (cards, panels, table rows)
bg-hover:     #1F1F23   (hover state)
border:       rgba(255,255,255,0.07)
border-focus: rgba(255,255,255,0.15)

text-primary:   #FAFAFA
text-secondary: #A1A1AA
text-muted:     #52525B
text-faint:     #3F3F46

accent-red:     #D7261E  (CTAs, active nav, critical, destructive)
accent-orange:  #F59E0B  (warnings, high priority, blocked)
accent-blue:    #38BDF8  (info, medium priority, in-progress)
accent-green:   #22C55E  (done, success, ready)

font-label:  9px / 700 / letter-spacing: 1.5px / uppercase  (section headings, column labels)
font-body:   13px / 400  (default content)
font-small:  11px / 400  (secondary content)
font-mono:   JetBrains Mono  (IDs, scores, timestamps)
```

### OS Sidebar

- Fixed left sidebar, 220px wide, `#111112` bg, `rgba(255,255,255,0.07)` right border
- Logo at top: `BY RED` in Barlow Condensed or similar condensed typeface, red `#D7261E`
- Nav item active state: red `#D7261E` text + `rgba(215,38,30,0.10)` bg, 2px left red border
- Nav item default: `#71717A` text, hover `#A1A1AA`
- Nav groups with uppercase label (font-label style) as section dividers

**Full nav structure (in order):**

```text
TODAY           → /os/today
TASKS           → /os/tasks
CALENDAR        → /os/calendar
─── PROJECTS ───
PROJECTS        → /os/projects
BOARDS          → /os/boards
DASHBOARD       → /os/dashboard
─── TEAM ───
TEAM            → /os/team
─── AUTOMATIONS ───
WORKFLOWS       → /os/workflows
TRIGGERS        → /os/triggers
─── INTEL ───
CRM             → /os/crm
LANTERN AI      → /os/lantern-ai
─── WORKSPACE ───
DOCS            → /os/docs
FILES           → /os/files
IMPORT          → /os/import
REPORTS         → /os/reports
COMMS           → /os/comms
SETTINGS        → /os/settings
```

### OS Layout

```tsx
// app/os/layout.tsx — server component
<div style={{ display: 'flex', minHeight: '100vh', background: '#111112' }}>
  <OsSidebar />   {/* fixed, 220px */}
  <main style={{ flex: 1, marginLeft: 220, minHeight: '100vh' }}>
    {children}
  </main>
</div>
```

---

## Data Model

### byred_tasks (extended — all OS task work uses this table)

```sql
-- Original fields
id uuid, tenant_id uuid, monday_item_id text,
title text, description text,
status: not_started | in_progress | overdue | done | blocked | cancelled,
priority: critical | high | medium | low,
due_date date, estimated_minutes int,
ai_mode: HUMAN_ONLY | AI_ASSIST | AI_DRAFT | AI_EXECUTE,
blocker_flag bool, blocker_reason text, blocked_by_task_id uuid,
owner_user_id uuid,
revenue_impact_score int (1–10), urgency_score int (1–10),
created_at timestamptz, updated_at timestamptz, archived_at timestamptz

-- OS extensions (added via migration)
project_id uuid → os_projects.id,
board_id uuid → os_boards.id,
phase_id uuid → os_phases.id,
order_index int,
definition_of_done text,
acceptance_criteria text,
source_system text, source_id text, source_board_name text,
source_group_name text, source_row_hash text,
import_batch_id uuid → os_import_batches.id,
is_low_hanging_fruit bool, is_ready_for_ai bool,
is_ready_for_human bool, needs_decision bool,
waiting_on_external bool,
start_date timestamptz, calendar_start_at timestamptz,
calendar_end_at timestamptz, all_day bool,
recurrence_rule text, calendar_color text, calendar_label text
```

### os_projects

```sql
id uuid, tenant_id uuid,
name text, description text,
status text (active | archived),
priority text (critical | high | medium | low),
due_date timestamptz, start_date timestamptz,
order_index int,
owner_user_id uuid → byred_users.id,
created_by_user_id uuid → byred_users.id,
created_at timestamptz, updated_at timestamptz
```

### os_boards

```sql
id uuid, tenant_id uuid, project_id uuid → os_projects.id,
name text, description text,
board_type text (kanban | sprint | list | calendar),
status text (active | archived),
kpi_config jsonb,
created_by_user_id uuid → byred_users.id,
created_at timestamptz, updated_at timestamptz
```

### os_phases

```sql
id uuid, board_id uuid → os_boards.id,
name text, description text,
order_index int,
created_at timestamptz, updated_at timestamptz, archived_at timestamptz
```

### os_calendar_events

```sql
id uuid, tenant_id uuid,
project_id uuid, board_id uuid, task_id uuid,
title text NOT NULL,
description text, event_type text, status text,
start_at timestamptz NOT NULL, end_at timestamptz,
all_day bool, timezone text, location text,
owner_user_id uuid, created_by_user_id uuid,
external_provider text, external_calendar_id text, external_event_id text,
last_synced_at timestamptz, sync_status text, sync_error text,
recurrence_rule text, recurrence_parent_id uuid,
reminder_minutes int[], reminder_at timestamptz[],
calendar_color text, calendar_label text,
visibility text (private | team | client_visible),
created_at timestamptz, updated_at timestamptz, archived_at timestamptz
```

### os_workflows

```sql
id uuid, tenant_id uuid,
name text, trigger_event text,
condition jsonb, action jsonb NOT NULL,
is_active bool, created_by uuid,
created_at timestamptz, updated_at timestamptz
```

### os_triggers

```sql
id uuid, tenant_id uuid,
name text, watch_entity text,
watch_condition jsonb NOT NULL,
alert_user_ids uuid[], alert_channels text[],
is_active bool,
created_at timestamptz, updated_at timestamptz
```

### os_task_dependencies

```sql
id uuid, task_id uuid → byred_tasks.id,
depends_on_task_id uuid → byred_tasks.id,
tenant_id uuid,
dependency_type text (blocks | related | duplicates),
created_at timestamptz
```

### os_import_batches / os_import_rows

Used for Monday.com and CSV imports. `source_system` values: `monday` | `csv`.

### Placeholder tables (minimal schema — not used in UI yet)

`os_docs`, `os_companies`, `os_contacts`, `os_ai_threads`,
`os_notifications`, `os_integrations`, `os_search_index`, `os_ai_context_links`

---

## API Routes

All OS APIs live under `/api/os/*`. All require authentication (Supabase session cookie).

```text
GET/POST   /api/os/tasks
GET/PATCH/DELETE /api/os/tasks/[id]
POST       /api/os/tasks/reorder
POST       /api/os/tasks/[id]/dependencies

GET/POST   /api/os/projects
GET/PATCH/DELETE /api/os/projects/[id]

GET/POST   /api/os/boards
GET/PATCH/DELETE /api/os/boards/[id]

GET/POST/PATCH/DELETE /api/os/calendar  (PATCH & DELETE via ?id= query param)

GET        /api/os/team

GET/POST   /api/os/workflows
GET/PATCH/DELETE /api/os/workflows/[id]

GET/POST   /api/os/triggers
GET/PATCH/DELETE /api/os/triggers/[id]
```

**Key API conventions:**

- All list GETs accept `?tenant_id=` to scope results
- Soft-delete uses `status: 'archived'` (os_boards, os_projects) or `archived_at` (byred_tasks, os_calendar_events)
- PATCH bodies accept only the fields in the `allowed` list inside each route — extra fields are silently ignored

---

## App Structure (current file tree)

```text
app/
  (app)/                     ← Light shell (existing)
    layout.tsx
    dashboard/, tasks/, leads/, activities/, tenants/, settings/
  os/                        ← Dark OS shell (new)
    layout.tsx               ← OsSidebar + dark bg wrapper
    page.tsx                 ← redirect('/os/today')
    today/page.tsx           ← Daily brief + focus tasks
    tasks/page.tsx           ← Task table with tenant tabs
    tasks/[id]/page.tsx      ← Task detail (dark)
    tasks/new/page.tsx       ← New task form (client component)
    calendar/page.tsx        ← Calendar grid
    projects/page.tsx
    boards/page.tsx
    dashboard/page.tsx
    team/page.tsx
    workflows/page.tsx
    triggers/page.tsx
    crm/page.tsx             ← Coming soon stub
    lantern-ai/page.tsx      ← Coming soon stub
    docs/page.tsx            ← Coming soon stub
    files/page.tsx           ← Coming soon stub
    import/page.tsx          ← Import wizard
    reports/page.tsx         ← Coming soon stub
    comms/page.tsx           ← Coming soon stub
    settings/page.tsx
  login/, register/, forgot-password/, reset-password/, onboarding/
  page.tsx                   ← Hero landing
api/
  auth/login/route.ts
  os/
    tasks/, tasks/[id]/, tasks/[id]/dependencies/, tasks/reorder/
    projects/, projects/[id]/
    boards/, boards/[id]/
    calendar/
    team/
    workflows/, workflows/[id]/
    triggers/, triggers/[id]/
components/
  byred/
    os-sidebar.tsx           ← The dark OS sidebar
    auth-shell.tsx, sidebar.tsx, topbar.tsx
  os/
    BackButton.tsx, ComingSoon.tsx, EditableField.tsx, OSTopBar.tsx
lib/
  supabase/server.ts         ← createClient() → SupabaseClient<Database>
  data/
    tenant-scope.ts          ← requireTenantScope(), assertTenantInScope()
    tasks.ts, tasks-os.ts, activities.ts, daily-briefs.ts
  auth/allowlist.ts          ← isInternalMember(email)
  tenant-colors.ts
types/
  database.ts                ← Supabase-generated types + named aliases
  db.generated.ts            ← Re-exports from database.ts
  db.ts                      ← UI-layer types (Task, Lead, Activity, mapTaskFromDb)
```

---

## Supabase Client

```ts
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

export async function createClient(): Promise<SupabaseClient<Database>> {
  // ...
  return createServerClient(url, anonKey, { cookies: {...} }) as unknown as SupabaseClient<Database>
  // Note: `as unknown as` cast is required — @supabase/ssr@0.6.x and
  // @supabase/supabase-js@2.104.x have mismatched SupabaseClient generic arities.
  // Runtime is correct; the cast makes types resolve.
}
```

**All table queries are fully typed.** `supabase.from('os_boards')` resolves to the correct Row/Insert/Update types from `types/database.ts`.

---

## Auth & Access Control

```ts
// How auth works in OS routes
import { requireTenantScope } from '@/lib/data/tenant-scope'
const { tenantIds } = await requireTenantScope()
// tenantIds: string[] of UUIDs the current user has access to
// Throws → caught by try/catch → returns 401

// Calendar route uses allowlist check instead:
import { isInternalMember } from '@/lib/auth/allowlist'
const { data: { user } } = await supabase.auth.getUser()
if (!isInternalMember(user.email)) return 403
```

---

## Component Conventions (apply to ALL new OS components)

- **Server components by default.** Add `'use client'` only for forms/interactivity.
- **Inline `style={{}}` for all OS dark-theme values** — Tailwind classes won't have the dark tokens without config.
- **Static layout:** Tailwind classes are fine for flex/grid/spacing.
- **No shadcn/ui in OS shell** — build raw with inline styles + Tailwind.
- **Icons:** `lucide-react` only.
- **Toast:** `sonner` — `toast.success()`, `toast.error()`.
- **No `<form>` from shadcn** — use native `<form onSubmit={...}>`.
- **Imports:** `@/` path alias for all internal imports.

### OS page template

```tsx
// Typical dark OS server page structure
export default async function OsXxxPage() {
  const { tenantIds } = await requireTenantScope()
  const supabase = await createClient()

  const { data } = await supabase.from('...').select('...').in('tenant_id', tenantIds)

  return (
    <div style={{ padding: '28px 28px 64px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FAFAFA', letterSpacing: '-0.4px' }}>
          Page Title
        </h1>
        <p style={{ fontSize: 11, color: '#52525B' }}>subtitle / count</p>
      </div>
      {/* Content */}
    </div>
  )
}
```

### OS card pattern

```tsx
<div style={{
  background: '#18181B',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 8,
  padding: 16,
}}>
  {/* content */}
</div>
```

### OS status pill pattern

```tsx
// status → color mapping:
const STATUS_COLOR: Record<string, string> = {
  not_started: '#71717A',
  in_progress:  '#38BDF8',
  done:         '#22C55E',
  overdue:      '#D7261E',
  blocked:      '#F59E0B',
  cancelled:    '#52525B',
}
// Render:
<span style={{
  fontSize: 10, fontWeight: 700,
  padding: '2px 8px', borderRadius: 4,
  background: `${statusColor}18`,
  color: statusColor,
}}>
  {label}
</span>
```

### OS label pattern (section/column headings)

```tsx
<span style={{
  fontSize: 9, fontWeight: 700,
  letterSpacing: 1.5, color: '#3F3F46',
  textTransform: 'uppercase',
}}>
  COLUMN NAME
</span>
```

---

## Named Type Exports

```ts
// From types/database.ts (generated + appended)
export type ByredTenant, ByredTenantInsert, ByredTenantUpdate
export type ByredUser, ByredUserInsert, ByredUserUpdate
export type ByredUserTenant, ByredUserTenantInsert, ByredUserTenantUpdate
export type ByredTask, ByredTaskInsert, ByredTaskUpdate
export type ByredLead, ByredLeadInsert, ByredLeadUpdate
export type ByredActivity, ByredActivityInsert, ByredActivityUpdate
export type ByredDailyBrief, ByredDailyBriefInsert, ByredDailyBriefUpdate
export type DailyBriefSummary  // { headline, top_3, warnings, next_action, verification_notes }
export type TaskStatus         // 'not_started' | 'in_progress' | 'overdue' | 'done' | 'blocked' | 'cancelled'
export type TaskPriority       // 'critical' | 'high' | 'medium' | 'low'
export type AiMode, LeadStage, UserRole, TenantType

// From types/db.ts (UI-layer)
export type Task     // mapped shape for UI components
export type Lead, Activity, DailyPlan
export function mapTaskFromDb(row): Task
```

---

## Existing Pages — What's Built

| Route | Status | Notes |
| --- | --- | --- |
| `/os` | ✅ | Redirects to `/os/today` |
| `/os/today` | ✅ | Daily brief + focus task queue |
| `/os/tasks` | ✅ | Task table + tenant tabs |
| `/os/tasks/[id]` | ✅ | Dark detail page |
| `/os/tasks/new` | ✅ | Client form → POST /api/os/tasks |
| `/os/calendar` | ✅ | Calendar grid (events + task due dates) |
| `/os/projects` | ✅ | Project list + create |
| `/os/boards` | ✅ | Board list per project |
| `/os/dashboard` | ✅ | OS metrics dashboard |
| `/os/team` | ✅ | Team members + active task counts |
| `/os/workflows` | ✅ | Workflow list + create |
| `/os/triggers` | ✅ | Trigger list + create |
| `/os/import` | ✅ | Import wizard (Monday/CSV) |
| `/os/lantern-ai` | ✅ | AI assistant interface |
| `/os/settings` | ✅ | OS settings + integrations |
| `/os/crm` | 🔲 stub | Coming soon |
| `/os/docs` | 🔲 stub | Coming soon |
| `/os/files` | 🔲 stub | Coming soon |
| `/os/reports` | 🔲 stub | Coming soon |
| `/os/comms` | 🔲 stub | Coming soon |

---

## Shell 1: App Shell (light, reference only)

Routes under `(app)/`. Do not modify these unless explicitly asked.

```text
Design tokens:
  canvas: #FAFAFA, surface: #FFFFFF
  sidebar: white, 210px fixed
  accent: #D7261E (red)
  text-primary: #0A0A0A
  border: #E4E4E7
```

Key components: `AppSidebar`, `AppTopbar`, `TaskTable`, `TasksList`, `LeadsKanban`, `StatusBadge`, `TenantPill`, `OwnerAvatar`, `CommandPalette`, `BoardTabs`.

---

## What to Generate

When building new OS components or pages:

1. **Default to dark tokens** from the OS shell token list above
2. **Wire to real data** — use `requireTenantScope()` + `createClient()` for server components; fetch `/api/os/*` for client components
3. **Use real types** — import from `@/types/database` or `@/types/db`
4. **Match OS page template** — 28px padding, `#FAFAFA` page title at 22px/800, `#52525B` subtitle at 11px
5. **No placeholder text, no TODO comments in UI**
6. **Do not touch `(app)/` routes** unless explicitly asked
7. **Coming-soon pages** use the `ComingSoon` component at `components/os/ComingSoon.tsx`
