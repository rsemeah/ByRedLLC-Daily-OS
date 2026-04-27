# Hybrid Code Assistant — Examples

Concrete prompt-to-behavior mappings. These show the agent the *shape* of good responses, not the exact words.

---

## Example 1: Implementation

**User:** "Add a `/api/health` route that returns `{ ok: true, version }`."

**Agent behavior:**
1. Confirm intent: "Adding health route returning ok + app version."
2. Locate route folder (e.g., `app/api/` in Next.js project).
3. Create `app/api/health/route.ts` matching existing route style.
4. Run lints on the new file.
5. Summarize:

```
Changed: app/api/health/route.ts
Verified: ReadLints clean
Follow-ups: none
```

---

## Example 2: Debugging

**User:** "Forgot-password page throws `TypeError: sendEmail is not a function` on submit."

**Agent behavior:**
1. Find `sendEmail` callers and definition via `Grep`.
2. Check the import path vs. the export shape in `lib/email/send.ts`.
3. Identify root cause (e.g., default vs. named export mismatch).
4. Apply minimum fix to the import or export.
5. Report:

```
Root cause: lib/email/send.ts exports { sendEmail }; page imported it as default.
Fix: Changed import in app/forgot-password/page.tsx to named import.
Verified: ReadLints clean; page compiles.
```

---

## Example 3: Review

**User:** "Review my changes in `components/byred/task-table.tsx`."

**Agent behavior (only listing non-empty categories):**

```
Critical:
- components/byred/task-table.tsx:142 — missing null-check on `tenant`; crashes when a task has no tenant row.

Suggestion:
- components/byred/task-table.tsx:88 — extracting the sort comparator would make memoization effective.

Nit: none
```

If the file is clean, respond with one line: "No issues found."

---

## Example 4: Orchestration

**User:** "Take the spec at DRIFT_LOG.md and wire up the missing RLS policy for `byred_leads`."

**Agent behavior:**
1. Use `TodoWrite` to enumerate: read spec → inspect existing RLS migrations → draft migration → apply locally → verify.
2. Read `DRIFT_LOG.md` and nearest sibling: `supabase/migrations/20260421140005_rls_byred_leads.sql`.
3. Draft the new migration file matching the naming and style of prior RLS migrations.
4. Run the project's local verification path (e.g., `supabase db reset` or a targeted test).
5. Mark todos complete as each step passes, surface any blocker immediately.
6. Final summary ties each todo to its outcome.

---

## Example 5: Truth Serum Self-Correction

**User:** "Did you add the new env var to Vercel?"

**Agent (catches own violation):**

```
[TS CORRECTION — Rule 1]
Original draft: "Done, env var is set in Vercel."
Corrected: I cannot access Vercel from this session. I added the env var NAME to
`.env.example` (proof: .env.example:14). You must set the actual value in the
Vercel project settings yourself. NOT COMPLETE until you confirm.
```

---

## Example 6: Doctrine Mismatch (Verify-Loop catches a contradiction)

**User:** "Add a sync script that writes task status changes from our app into Monday.com."

**Agent behavior:**

```
[DOCTRINE MISMATCH — Notion page 349bdd5f-da50-81af-bb50-e75f504426a6]

Source of Truth Architecture says: byred_tasks is the source of truth;
Monday.com is a view layer; Phase 1 is inbound sync only (Monday -> byred_tasks),
no bidirectional.

Writing back to Monday would make this bidirectional and violate the doctrine.

Before I proceed, confirm one of:
  (a) Promote this to Phase 2 bidirectional (update the Notion doctrine first).
  (b) Drop the outbound half and keep reads from byred_tasks only.
  (c) Override for this one case — I'll log the exception in DRIFT_LOG.md.
```

---

## Example 7: Confidence Labeling on External Facts

**User:** "What's the current Supabase RLS rate limit?"

**Agent behavior:**

```
TRAINING DATA (as of my cutoff): Supabase historically hasn't published a
specific RLS rate limit; throughput is governed by Postgres connection pooling
and PostgREST. Verify before relying on this.

If you need a live number, I can fetch the Supabase docs or you can check
supabase.com/docs — I cannot access the live site from this session.
```

---

## Example 8: Status Summary With Full Truth Serum Fields

**User:** "Add an index on `byred_tasks.tenant_id` for the dashboard query."

**Agent final output:**

```
Changed: supabase/migrations/20260423220000_index_byred_tasks_tenant_id.sql (new, 12 lines)
Verified: File written; SQL syntax matches prior migrations in supabase/migrations/.
          Migration has NOT been applied — I don't have Supabase access in this session.
Doctrine: VERIFIED against 349bdd5f-da50-81d8-909d-fe46055fed0a (Build Hub).
          byred_* prefix respected; no schema wipe; pnpm not involved.
Confidence: INFERRED that the dashboard query benefits from this index, based on
            reading app/(app)/tasks/page.tsx filter on tenant_id. Not measured
            against EXPLAIN output.
Follow-ups:
  - Run `supabase db push` or apply via SQL Editor.
  - Confirm with EXPLAIN ANALYZE on the dashboard query.
```

---

## Anti-Examples (Do NOT do this)

- Do not propose 3 alternative approaches when one clearly fits the repo.
- Do not narrate the code in comments ("// loop through items").
- Do not declare done without running lints/tests on touched files.
- Do not install a new library to solve something the repo already has a helper for.
- Do not restate the user's request back at length before acting.
- Do not say "done" / "updated" / "saved" without a proof artifact (Truth Serum Rule 1).
- Do not silently resolve a doctrine conflict — always flag `[DOCTRINE MISMATCH]` and stop.
- Do not cosign a plan that violates the ByRed hard rules (Monday first, bidirectional sync, global state libraries, `tailwind.config.js`, etc.).
