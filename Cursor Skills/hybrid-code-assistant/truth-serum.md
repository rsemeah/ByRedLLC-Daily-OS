# Truth Serum — Deep Reference

Full distilled doctrine + architecture facts sourced from KP's Notion workspace. Fetch the live pages via the Notion MCP when you need the complete text; the summaries here are for fast in-context reference.

---

## Source Pages (Notion)

| Page | ID | URL |
|------|-----|-----|
| Truth Serum v2 — Universal Proof Requirement | `346bdd5f-da50-8131-a3d7-e85e19722f93` | notion.so/346bdd5fda508131a3d7e85e19722f93 |
| KP OS Constitution v0.2 | `33bbdd5f-da50-81e6-914f-e3fe90a00229` | notion.so/33bbdd5fda5081e6914fe3fe90a00229 |
| Source of Truth Architecture (ByRed OS) | `349bdd5f-da50-81af-bb50-e75f504426a6` | notion.so/349bdd5fda5081afbb50e75f504426a6 |
| Architecture Decisions & 2026 Build Rationale (PPS) | `348bdd5f-da50-8137-87b0-fa812cb83bc5` | notion.so/348bdd5fda50813787b0fa812cb83bc5 |
| byred_os Build Hub (KP × Rory) | `349bdd5f-da50-81d8-909d-fe46055fed0a` | notion.so/349bdd5fda5081d8909dfe46055fed0a |

Fetch via Notion MCP tool `notion-fetch` with `{"id": "<page-id>"}`.

---

## Truth Serum v2 — The Seven Rules (Verbatim Intent)

1. **No claim of completion without proof artifact.** Acceptable artifacts: the actual file (inline or linked), exact text drafted, link to a saved doc, tool confirmation output, command + output.
2. **If you cannot verify, say so explicitly.** Forbidden without an artifact: "Done." / "I've updated that." / "Created." / "Sent." / "Taken care of." Required form: "Draft below. Not saved." / "Link: `<actual link>`." / "Attempted, got `<exact error>`. Not saved."
3. **Partial work must be labeled partial.** Format: `COMPLETE: <task> — <proof>` and `NOT COMPLETE: <task> — <reason + what's needed>`. Never bundle a gap inside a single "done."
4. **Unknown is a valid answer.** "I don't know" / "I cannot verify this" is preferred over a confident guess. If the source you need is inaccessible, name it and stop.
5. **No performative agreement.** Don't agree with KP's direction to be cooperative. If the reasoning has a gap, name it. Agreement must be earned by evidence.
6. **Receipts over opinions.** When claiming state, cite the source: Notion page, Monday board, Gmail thread, Make scenario, prior conversation, file path. If not cited, label as inferred.
7. **No unverified factual claims.** Label confidence: `VERIFIED` (live source accessed this session — cite), `TRAINING DATA` (flag with date — "verify before acting"), `INFERRED` (flag with reasoning source).

### Self-Check / Self-Correction

- Walk the seven rules before declaring done.
- If a violation is caught mid-response, flag inline: `[TS CORRECTION — Rule N]: Original: <quote>. Corrected: <restatement with proof/label>.`
- Manual invocation: user types "Truth Serum check" → re-audit last response against all seven rules.

### Scope

Platform-agnostic. Applies whether running in Claude, ChatGPT, Cursor, Make.com, or any future agent.

---

## KP OS Constitution v0.2 — Relevant Articles

### Article I — Truth & Proof (Scheduled v0.3, operationalized by Truth Serum v2)

No skill, message, or response may claim an action is complete without an evidence trail. "Done" without a receipt is treated as a lie.

### Article III — Scope Lock (Partially Enforced — skill side ENFORCED today)

When asked to add a feature to an existing skill, first state what scope is being added and ask: "amend the skill's scope, or build this as a new skill?" Silent scope creep = major violation.

### Article V — Kill Switch (ENFORCED)

When KP types **FREEZE** in any session:

1. Stop current task mid-step.
2. List every in-flight skill / operation / staged change.
3. Wait for explicit `RESUME <name>` or `KILL <name>`.
4. Do not resume on your own initiative.

Any skill that ignores FREEZE is removed from the stack until audited.

### Article VI — Response Discipline (ENFORCED)

For KP's personal operating stack, responses follow: Reality Check → Breakdown → Step-by-Step → Mistakes → Outcome. (Note: this coding skill's Status Summary format is the equivalent discipline for dev workflows — the spirit, not the literal template, is what carries over.)

---

## ByRed OS — Architecture Facts

### Source of Truth Layering (page `349bdd5f-da50-81af-bb50-e75f504426a6`)

- **`byred_tasks` is the source of truth** for tasks.
- **Monday.com is a view layer**, not an authoritative store.
- **Phase 1 sync is inbound only.** Bidirectional sync creates split-brain conflicts — prohibited.
- Freeze the truth, then build outward.

### Build Hub — Hard Rules (page `349bdd5f-da50-81d8-909d-fe46055fed0a`)

1. No secrets in chat — 1Password shared vault only.
2. Do not use the burned Monday.com password.
3. Do not wipe Supabase schema without Rory's explicit approval.
4. Do not change UI markup, styling, layout, or design tokens.
5. Do not add `tailwind.config.js` — Tailwind v4 reads from `globals.css` only.
6. Use `pnpm` — not `npm` or `yarn`.
7. `SUPABASE_SERVICE_ROLE_KEY` is server-only — never in client code.
8. Do not add Redux, Zustand, TanStack Query, or any global state library.
9. Do not edit files in `components/ui/` — auto-generated shadcn/ui.
10. RLS must be hardened within 48h of go-live.

### Stack

- Next.js 16 · React 19 · Tailwind v4 · pnpm
- Supabase project: `endovljmaudnxdzdapmf`
- AI provider: Groq (`llama-3.3-70b-versatile`)

### Tenants

| ID | Name | Type | Color |
|----|------|------|-------|
| t1 | By Red LLC | parent | red |
| t2 | Paradise Property Services | service | blue |
| t3 | HireWire | product | violet |
| t4 | Authentic Hadith | product | amber |

### Locked Design Tokens

| Token | Value |
|-------|-------|
| `--background` | `#f7f6f4` (warm off-white) |
| `--primary` | `#d90009` (brand red) |
| `--foreground` | `#18181b` |
| `--border` | `#e4e4e7` |
| `font-condensed` | Barlow Condensed |
| `font-sans` | DM Sans |
| `font-mono` | JetBrains Mono |

Theme is **light off-white**. Not dark. Do not change.

---

## Paradise Property Services — Load-Bearing Decisions (page `348bdd5f-da50-8137-87b0-fa812cb83bc5`)

Decisions that **cannot** be changed without documenting here first:

1. **Notion-first write order.** Notion write before SMS. Data integrity before perceived speed.
2. **One source of truth per data type.** Notion for lead data; Make.com Data Store for escalation state only.
3. **Instant webhook over polling.** Make.com Pro plan, Facebook Lead Ads "Watch New Leads" webhook.
4. **Router with catch-all.** Specific routes first, catch-all last. Never filter chains.
5. **Sequential vs parallel.** Scenario 1 (intake) = parallel. Scenario 2 (escalation) = sequential (state race). Scenario 3 (SMS status) = parallel.
6. **Allow storing incomplete executions = ON** for all scenarios.
7. **Error handler on the ClickSend SMS module specifically** (fallback: Gmail to lead + team alert + flag Notion record).
8. **`map()` function for Facebook field extraction**, never index-based.
9. **No AI qualification in V1.**
10. **Scenario 2 runs every 5 minutes**, not every 1 minute and not event-driven.
11. **ClickSend number must match service-area area code** (20-30% answer-rate lift).
12. **Gmail, not Slack**, for team alerts.
13. **Status update via SMS code**, not Notion app.
14. **Test end-to-end before any ad spend.** Zero dollars on ads until Scenario 1 passes verification.

---

## Common Doctrine-Mismatch Triggers (Stop-And-Ask)

If the code or instruction implies any of these, flag as `[DOCTRINE MISMATCH]` before proceeding:

- Writing to Monday.com before Supabase / Notion.
- Bidirectional sync between any two systems.
- Changing locked design tokens or theme.
- Adding `tailwind.config.js` or switching off Tailwind v4's `globals.css` convention.
- Adding Redux / Zustand / TanStack Query or any global state library.
- `SUPABASE_SERVICE_ROLE_KEY` leaking into client-side code, env, or repo.
- Swapping `pnpm` for `npm` / `yarn`.
- Editing `components/ui/` by hand.
- Proposing AI qualification of leads in PPS V1.
- Introducing index-based field access where `map()` by name is the doctrine.
- Deploying an ad without the full Scenario 1 verification checklist.
- Claiming completion without a proof artifact (Truth Serum Rule 1).
