-- Migration: 20260429_byred_os_migration_safety
-- Idempotency guards and safety indexes for existing byred_* tables.
-- Safe to run multiple times (all use IF NOT EXISTS / DO NOTHING patterns).

-- ─── byred_users: ensure source column exists ─────────────────────────────────
ALTER TABLE byred_users ADD COLUMN IF NOT EXISTS source text DEFAULT 'auth';

-- ─── byred_tasks: ensure monday_item_id unique index exists ──────────────────
-- The sync route uses ON CONFLICT (monday_item_id) — requires a unique index.
CREATE UNIQUE INDEX IF NOT EXISTS byred_tasks_monday_item_id_key
  ON byred_tasks(monday_item_id)
  WHERE monday_item_id IS NOT NULL;

-- ─── byred_users: ensure avatar_url column exists ────────────────────────────
ALTER TABLE byred_users ADD COLUMN IF NOT EXISTS avatar_url text;

-- ─── byred_user_tenants: no updated_at — document that clearly ───────────────
-- byred_user_tenants does NOT have an updated_at column.
-- ON CONFLICT clause in application code must NOT reference updated_at.
-- Verified: only (user_id, tenant_id, role) are valid update targets.

-- ─── os_projects updated_at trigger ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'os_projects', 'os_boards', 'os_tasks', 'os_calendar_events',
    'byred_tasks', 'byred_users'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_' || tbl || '_updated_at'
        AND tgrelid = tbl::regclass
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%I_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
        tbl, tbl
      );
    END IF;
  END LOOP;
END;
$$;

-- ─── Seed: ensure all 3 core users have byred_users rows with correct data ────
-- This is a safety re-run — no-ops if data is already correct.
UPDATE byred_users SET source = 'auth', active = true
WHERE email IN (
  'roryleesemeah@icloud.com',
  'g.homira@gmail.com',
  'clashon64@gmail.com'
);

-- ─── Verify: confirm os_calendar_events table exists ─────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'os_calendar_events'
  ) THEN
    RAISE EXCEPTION 'os_calendar_events table missing — run 20260429_byred_os_calendar.sql first';
  END IF;
END;
$$;
