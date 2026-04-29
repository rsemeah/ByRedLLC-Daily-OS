
-- MIGRATION SAFETY: DO NOT RUN ORPHAN UPDATES UNTIL LEGACY RECORDS EXIST
-- 1. Upsert or create required records

-- By Red LLC tenant
INSERT INTO byred_tenants (name, type, color)
SELECT 'By Red LLC', 'organization', '#037f4c'
WHERE NOT EXISTS (SELECT 1 FROM byred_tenants WHERE name = 'By Red LLC');

-- Legacy Imported Work project
INSERT INTO os_projects (tenant_id, name)
SELECT id, 'Legacy Imported Work' FROM byred_tenants WHERE name = 'By Red LLC'
    AND NOT EXISTS (SELECT 1 FROM os_projects WHERE name = 'Legacy Imported Work');

-- Legacy Task Board
INSERT INTO os_boards (project_id, name)
SELECT p.id, 'Legacy Task Board' FROM os_projects p WHERE p.name = 'Legacy Imported Work'
    AND NOT EXISTS (SELECT 1 FROM os_boards WHERE name = 'Legacy Task Board');

-- Backlog phase for Legacy Task Board
INSERT INTO os_phases (board_id, name, order_index)
SELECT b.id, 'Backlog', 0 FROM os_boards b WHERE b.name = 'Legacy Task Board'
    AND NOT EXISTS (SELECT 1 FROM os_phases WHERE name = 'Backlog' AND board_id = b.id);

-- 2. Only update orphans if all legacy records exist
DO $$
DECLARE
    legacy_project_id uuid;
    legacy_board_id uuid;
    legacy_phase_id uuid;
    legacy_tenant_id uuid;
BEGIN
    SELECT id INTO legacy_tenant_id FROM byred_tenants WHERE name = 'By Red LLC';
    SELECT id INTO legacy_project_id FROM os_projects WHERE name = 'Legacy Imported Work';
    SELECT id INTO legacy_board_id FROM os_boards WHERE name = 'Legacy Task Board';
    SELECT id INTO legacy_phase_id FROM os_phases WHERE name = 'Backlog' AND board_id = legacy_board_id;

    IF legacy_tenant_id IS NOT NULL AND legacy_project_id IS NOT NULL AND legacy_board_id IS NOT NULL AND legacy_phase_id IS NOT NULL THEN
        -- Only update if all records exist
        UPDATE byred_tasks SET project_id = legacy_project_id WHERE project_id IS NULL;
        UPDATE byred_tasks SET board_id = legacy_board_id WHERE board_id IS NULL;
        UPDATE byred_tasks SET phase_id = legacy_phase_id WHERE phase_id IS NULL;
        -- If tenant_id column exists:
        -- UPDATE byred_tasks SET tenant_id = legacy_tenant_id WHERE tenant_id IS NULL;
    END IF;
END $$;

-- 3. Validation queries after update
-- Count tasks where project_id is null
SELECT count(*) AS orphaned_project_id FROM byred_tasks WHERE project_id IS NULL;
-- Count tasks where board_id is null
SELECT count(*) AS orphaned_board_id FROM byred_tasks WHERE board_id IS NULL;
-- Count tasks where phase_id is null
SELECT count(*) AS orphaned_phase_id FROM byred_tasks WHERE phase_id IS NULL;
-- Count tasks where tenant_id is null (if column exists)
-- SELECT count(*) AS orphaned_tenant_id FROM byred_tasks WHERE tenant_id IS NULL;

-- 4. Migration report
SELECT
    (SELECT count(*) FROM byred_tasks) AS total_tasks,
    (SELECT count(*) FROM byred_tasks WHERE project_id = (SELECT id FROM os_projects WHERE name = 'Legacy Imported Work')) AS legacy_project_tasks,
    (SELECT count(*) FROM byred_tasks WHERE board_id = (SELECT id FROM os_boards WHERE name = 'Legacy Task Board')) AS legacy_board_tasks,
    (SELECT count(*) FROM byred_tasks WHERE phase_id = (SELECT id FROM os_phases WHERE name = 'Backlog' AND board_id = (SELECT id FROM os_boards WHERE name = 'Legacy Task Board'))) AS backlog_phase_tasks,
    (SELECT count(*) FROM byred_tasks WHERE project_id IS NULL OR board_id IS NULL OR phase_id IS NULL) AS remaining_orphaned_tasks;

-- 5. Calendar schema check (do not backlog schema)
-- Ensure os_calendar_events table exists (should be created in calendar migration)
-- If not, create it as REAL TODAY (see 20260429_byred_os_calendar.sql)

-- 6. NO DESTRUCTIVE SQL. No deletes, drops, or overwrites of existing non-null fields.
-- This migration is safe and idempotent.
