# Lesson: Finishing a Supabase + Next “Manual QA” When You Get Stuck in a Loop

**Purpose of this page:** Record what the actual blocker was, how we got unstuck (step-by-step questions), and the concrete procedure to complete next time. Use this for onboarding “future you” or any teammate who has to do the same without living through the thread.

**Audience:** You don’t have to “already know” DevOps, Supabase, or the CLI. The failure mode was *not* intelligence—it was a missing map between “run something manually” and the ordered sequence of tools and credentials.

---

## 1. The real problem (what you were stuck on)

You had working **code and migrations in Git**, and a list of things that had to be done **in the real Supabase project and browser** (link, push, seed, sign-up, SQL as user, break trigger, audit query). The stuck feeling came from:

- The checklist mixed **local CLI**, **cloud dashboard**, **env vars**, and **browser** steps without a single “you are on step 3 of 9” view.
- Phrases like “apply migrations” and “re-apply the auth trigger” assume you know **where** that runs (CLI vs SQL editor) and **in what order**.
- **`supabase login`** and **`supabase link`** and **`supabase db push`** are three different steps. Confusing one for another means you repeat the wrong command and feel like nothing advances.
- **“Clean dev DB”** is a state of the *remote* database, not a button in the repo. Until that’s true, `seed:users` can look “broken” or inconsistent.
- The **Notion/assistant can’t run `supabase link` for you** in a shared environment that has no access token. So “run this” had to be on *your* machine, which felt like the plan failed when it was actually an environment limit.

**Bottom line:** The work was 80% a **map + order problem** and 20% new concepts (project ref, service role, JWT in SQL).

---

## 2. How we troubleshot it (the meta-pattern)

The conversation worked when it stopped being “vague handoff” and became:

1. **Name the current step** — e.g. “You have finished `supabase login`; the next step is `supabase link`, not `db push` yet.”
2. **One next command** — exactly one primary action, with a single success criterion.
3. **“Where are we now?”** — you asked for explicit placement on the path; that prevented re-running the same step or skipping `link`.
4. **Clarify tools** — e.g. upgrading **Supabase CLI** (`brew upgrade supabase/tap/supabase`) vs the mental model of “updating `supabase link`” (there is no separate `link` version—`link` is a subcommand of the `supabase` binary).
5. **Separate public facts from secrets** — project **reference ID** appears in the dashboard URL; **service role** and **DB password** must never be posted in chat.

**Lesson for your workflow:** If you feel stuck in a loop, ask: *“What is the very next action, and what proves it succeeded?”* — not *“What is the whole project?”* in one message.

---

## 3. The ordered procedure (end-to-end)

Use this as the single source of order. Tweak project paths if your folder name differs.

### Phase A — CLI auth and project binding

| Step | Action | How you know it worked |
|------|--------|-------------------------|
| A1 | Install / update Supabase CLI (e.g. Homebrew `supabase/tap/supabase`) | `supabase --version` shows a current version (e.g. 2.90.0) |
| A2 | `supabase login` | Message like “You are now logged in” |
| A3 | `cd` to the repo that contains `supabase/migrations` | `pwd` is correct |
| A4 | `supabase link --project-ref <REF>` | `REF` = the id in the dashboard URL `/dashboard/project/<REF>/...` — **not** a secret |
| A5 | Enter DB password if prompted | **Project Settings → Database** if you need to reset it |

**Common mistake:** Running `db push` before `link` (CLI says it cannot find project ref).

### Phase B — Apply migrations

| Step | Action | How you know it worked |
|------|--------|-------------------------|
| B1 | `supabase db push` | Completes without error; or run each `supabase/migrations/*.sql` in **strict filename order** in **SQL Editor** if push isn’t an option |
| B2 | Auth trigger sanity | Migrations that `CREATE`/`DROP` the trigger on `auth.users` actually ran. If in doubt, run the `20260421…auth_bootstrap_tenant` / follow-up files in SQL Editor |

**Note:** Some teams only ever “paste SQL” in the dashboard; that is valid as long as **order** matches filenames.

### Phase C — Seed and data checks (service role, not the anon key)

| Step | Action | How you know it worked |
|------|--------|-------------------------|
| C1 | Set env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BYRED_KP_EMAIL`, `BYRED_RORY_EMAIL` | `pnpm seed:users` can connect |
| C2 | `pnpm seed:users` | Script prints active tenants and OK lines for each user |
| C3 | SQL or Table Editor: `byred_tenants`, `byred_users`, `byred_user_tenants` | Four org tenants (per migration design), no stray seed bootstrap workspaces, KP/Rory on all org tenants, `id` and `auth_user_id` match per design |

### Phase D — App E2E (browser)

| Step | Action | How you know it worked |
|------|--------|-------------------------|
| D1 | `pnpm dev`, open app | App loads |
| D2 | `/register` with a **new** email | User created; confirm email per project settings |
| D3 | After login | Lands on `/`, not stuck on `/onboarding`, sidebar shows personal workspace with admin (for normal sign-up, not seed metadata) |

### Phase E — RLS + JWT in SQL (advanced check)

| Step | Action | How you know it worked |
|------|--------|-------------------------|
| E1 | Get the logged-in user’s access token (browser storage / session) | Long JWT string available |
| E2 | In SQL editor, run with user context if your Supabase version supports it | `SELECT * FROM byred_users WHERE auth_user_id = auth.uid();` returns **one** row for that user |

### Phase F — Failure-path test (optional, dev only)

| Step | Action | How you know it worked |
|------|--------|-------------------------|
| F1 | Temporarily break or no-op the bootstrap function | New sign-up can’t get profile/tenant |
| F2 | New user | After ~60s, `/onboarding` shows the “stuck” / could not finish message |
| F3 | Restore the real `CREATE OR REPLACE` from the repo migrations | Sign-up works again |

### Phase G — Audit

| Step | Action | How you know it worked |
|------|--------|-------------------------|
| G1 | Query `byred_activities` filtered by `object_type` for tenant/user/membership tables | You see the rows you expect (membership often logs; some inserts during auth may not, by design) |

---

## 4. Glossary (quick)

- **Project reference ID:** The short id in the Supabase project URL. Safe to use in CLI; not the same as **service role**.
- **Service role key:** God-mode API key for server-side scripts (seeding). Never expose to the client or public repos.
- **Anon key:** For browser clients with RLS; not for `seed:users` if the script needs to bypass RLS.
- **Migrations:** Ordered SQL in `supabase/migrations/`. “Apply” = push or paste in that order.
- **RLS:** Row-level security; SQL run “as the user” needs their JWT so `auth.uid()` matches.
- **Bootstrap trigger:** A function on `auth.users` that creates app rows after sign-up. Lives in the **auth** world + **public** tables—easy to think “migrations are done” when this piece still needs applying.

---

## 5. What to do when you get stuck again (short script)

1. **Write down the last command that definitely succeeded** (e.g. `supabase login`).
2. **Open the table in section 3** and start at the next row—do not skip `link` before `push`.
3. **If the error mentions “project ref”** → you need `supabase link`, not a new feature flag.
4. **If the error mentions “access token”** → run `supabase login` on *this* machine.
5. **If seeding fails** → check **service role** + URL + a DB that has tenants (migrations/seed order).
6. **If an assistant can’t run CLI** → that’s expected; the assistant gives the exact command; you run it where you are logged in.

---

## 6. Suggested Notion properties (if you use a database)

- **Type:** Runbook / Lesson learned  
- **Project:** By Red (or your workspace name)  
- **Status:** Living document  
- **Tags:** `supabase`, `next`, `migrations`, `onboarding`, `devops-101`  
- **Date:** (today)

---

## 7. One-line “lesson” for a daily note

> Getting unstuck from “I keep getting prompts and nothing moves” is usually **naming the single next command and the success signal**—especially the difference between **login → link → push** in Supabase, and knowing the assistant often **cannot** complete link/push in its own sandbox.

---

*Generated as a handoff for Notion. Trim or expand sections; keep the Phase A–G order as the anchor.*
