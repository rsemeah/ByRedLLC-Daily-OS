# Schema Drift Log

Date: 2026-04-21

## Priority 0 Discovery Status

Live schema discovery is currently blocked by authentication configuration:

- `supabase gen types` failed because `SUPABASE_ACCESS_TOKEN` is not configured and `supabase login` has not been completed on this machine.
- `information_schema` inspection through Supabase PostgREST failed because the configured `SUPABASE_SERVICE_ROLE_KEY` is not a secret key accepted by admin-only endpoints.

## Current Source of Truth Used

Until live schema access is unblocked, `types/db.generated.ts` is a temporary fallback that re-exports from local `types/database.ts`.

## Drift Assessment (Provisional)

A true live-vs-local drift comparison cannot be completed yet without successful live schema introspection.

Potential drift risk already detected:

- Environment variable `MONDAY_BOARD_ID` in local `.env.local` does not match the required board reference in the implementation plan.

## Required Follow-up

1. Provide a valid `SUPABASE_SERVICE_ROLE_KEY` secret key in `.env.local`.
2. Authenticate Supabase CLI (`supabase login`) or set `SUPABASE_ACCESS_TOKEN`.
3. Re-run `scripts/discover-schema.ts` and `supabase gen types`.
4. Replace temporary fallback content in `types/db.generated.ts` with true live-generated types.
