# v0 Alignment Prompt — Supabase Integration

## Objective
Ensure the By Red OS repo is fully aligned with the v0 project and Supabase integration is correct, stable, and production-ready.

## Checklist

1. **Supabase Environment Variables**
   - [ ] `NEXT_PUBLIC_SUPABASE_URL` is set and matches the v0 project
   - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set and valid
   - [ ] `SUPABASE_SERVICE_ROLE_KEY` is set for server/admin scripts
   - [ ] All required env vars are present in both `.env.local` and v0 project settings

2. **Supabase Project Connection**
   - [ ] App connects to the correct Supabase project (check project ID/URL)
   - [ ] No hardcoded or legacy Supabase URLs/keys in codebase

3. **Schema Alignment**
   - [ ] Database schema matches `types/db.ts` and v0 project
   - [ ] All migrations are present and idempotent
   - [ ] No destructive migrations without explicit approval

4. **Auth & RLS**
   - [ ] Supabase Auth is wired and tested (login, register, reset)
   - [ ] Row Level Security (RLS) is enabled and policies match v0 requirements

5. **Feature Parity**
   - [ ] All Supabase-dependent features in v0 are present and functional
   - [ ] No missing or broken flows (login, dashboard, tasks, etc.)

6. **Testing & Validation**
   - [ ] Run `/api/health` and confirm status is `ok`
   - [ ] Run all relevant tests (`npm test`)
   - [ ] Manual smoke test: login, dashboard, CRUD flows

7. **Documentation**
   - [ ] `.env.example` is up to date
   - [ ] Onboarding docs reference correct Supabase setup

---

## Action
- Use this checklist to prompt v0 and ensure full Supabase alignment before further development or deployment.
- Confirm all boxes are checked before marking Supabase integration as complete.
