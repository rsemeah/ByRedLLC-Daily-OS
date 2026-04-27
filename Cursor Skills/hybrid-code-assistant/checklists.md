# Hybrid Code Assistant — Checklists

Fast per-mode checklists. Copy the relevant one inline into a todo list when the task is non-trivial.

---

## Implementation Checklist

- [ ] Restate goal in one sentence
- [ ] Identify the 2-5 files that need to change
- [ ] Read those files before editing
- [ ] Match existing patterns (imports, error handling, naming, test style)
- [ ] Write minimum viable change
- [ ] Run `ReadLints` on touched files
- [ ] Run targeted test or typecheck if available
- [ ] **Truth Serum self-check** — walk Rules 1-7 before declaring done
- [ ] **Verify-Loop** — if the change touches Supabase / Make / UI tokens / env vars, check against the matching Notion doctrine page (see [truth-serum.md](truth-serum.md))
- [ ] Produce status summary (Changed / Verified / Doctrine / Confidence / Follow-ups)

---

## Debugging Checklist

- [ ] Capture exact error signal (message, stack, failing test name)
- [ ] State hypothesis in one line before touching code
- [ ] Read the suspect code and its nearest call sites
- [ ] Apply minimum fix
- [ ] Add regression guard if trivially possible
- [ ] Re-run the failing signal to confirm green
- [ ] **Truth Serum self-check** — don't say "fixed" without the green signal as proof (Rule 1); if you can't re-run, say so explicitly (Rule 2)
- [ ] Report: Root cause / Fix / Verification (one line each)

---

## Review Checklist

Evaluation order (stop early if no issues above a tier):

- [ ] Correctness — logic, edge cases, null/undefined, async ordering
- [ ] Security — injection, authz, secrets, unsafe deserialization
- [ ] Data integrity — transactions, race conditions, RLS, migrations
- [ ] Performance — N+1, unnecessary re-renders, unbounded loops
- [ ] Readability — naming, dead code, duplication
- [ ] Tests — coverage of the changed paths

Output format:

```
Critical:
- <file>:<line> — <issue> — <concrete fix>

Suggestion:
- <file>:<line> — <issue> — <concrete fix>

Nit:
- <file>:<line> — <issue>
```

Omit empty sections. If nothing is wrong, say "No issues found."

---

## Orchestration Checklist

- [ ] Break the task into 3-7 concrete todos via `TodoWrite`
- [ ] Mark one todo in_progress at a time
- [ ] Batch independent reads/searches in parallel tool calls
- [ ] Verify after each meaningful change before moving on
- [ ] On blocker: stop, surface it, propose next-best action
- [ ] **Truth Serum per-step** — each todo closes with its proof artifact; any blocker is labeled `NOT COMPLETE: <task> — <reason>`
- [ ] **Verify-Loop per-step** — cross-check architecture-touching steps against the Notion doctrine pages
- [ ] On finish: summary that maps each todo to its outcome with proof

---

## Truth Serum Self-Check (apply before declaring done, any mode)

- [ ] Rule 1 — every "done"/"fixed"/"shipped" has a proof artifact (file+lines, tool output, command output)
- [ ] Rule 2 — unverifiable claims are stated as drafts or attempts with exact error text
- [ ] Rule 3 — partial work is labeled `COMPLETE:` vs `NOT COMPLETE:`, never bundled
- [ ] Rule 4 — inaccessible data is named and the task stops, not guessed at
- [ ] Rule 5 — gaps in the user's plan are flagged, not cosigned
- [ ] Rule 6 — every factual claim cites its source (file path, Notion page ID, command output)
- [ ] Rule 7 — external facts labeled `VERIFIED` / `TRAINING DATA (date)` / `INFERRED (source)`
- [ ] If you caught your own violation mid-response, flag it with `[TS CORRECTION — Rule N]` inline

---

## Verify-Loop Self-Check (apply when touching architecture)

Trigger if the change touches any of: Supabase schema, RLS, `byred_*` tables, Make.com scenarios, Monday sync, Notion writes, UI tokens, routing, auth, env vars, dependency list.

- [ ] Fetched the relevant Notion page via `notion-fetch` (IDs in [truth-serum.md](truth-serum.md))
- [ ] Compared the change to the page's doctrine
- [ ] If a contradiction exists, flagged as `[DOCTRINE MISMATCH — <page ID>]` and stopped
- [ ] If aligned, recorded `Doctrine: VERIFIED against <page ID>` in the status summary

---

## Pre-Flight (runs before any mode)

- [ ] Am I in the right repo? Check `git status` context if unsure.
- [ ] Does a skill or script already solve this? Check `.cursor/skills/` and `Cursor Skills/` in the project, plus `~/.cursor/skills/` personal.
- [ ] Is there a planning artifact I should read first? (e.g., `.cursor/plans/*.plan.md`, `DRIFT_LOG.md`)
- [ ] Do any of the ByRed hard rules apply to this task? (see [truth-serum.md](truth-serum.md))
