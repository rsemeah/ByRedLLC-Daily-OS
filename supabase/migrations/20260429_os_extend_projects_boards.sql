-- Extend os_projects and os_boards with columns required by the UI
-- Safe to run multiple times (all ADD COLUMN IF NOT EXISTS)

ALTER TABLE os_projects
  ADD COLUMN IF NOT EXISTS order_index    int              DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status         text             DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS priority       text             DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS owner_user_id  uuid,
  ADD COLUMN IF NOT EXISTS due_date       date,
  ADD COLUMN IF NOT EXISTS board_count    int              GENERATED ALWAYS AS (0) STORED;

-- drop the generated column and use a real one we can update
ALTER TABLE os_projects
  DROP COLUMN IF EXISTS board_count;

ALTER TABLE os_projects
  ADD COLUMN IF NOT EXISTS tenant_id_denorm uuid;  -- backfill via trigger or query if needed

-- os_boards: add kpi_config, status, board_type, tenant_id
ALTER TABLE os_boards
  ADD COLUMN IF NOT EXISTS kpi_config  jsonb   DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS status      text    DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS board_type  text    DEFAULT 'kanban',
  ADD COLUMN IF NOT EXISTS tenant_id   uuid;

-- Index for fast tenant lookups on new tables
CREATE INDEX IF NOT EXISTS idx_os_projects_tenant ON os_projects (tenant_id);
CREATE INDEX IF NOT EXISTS idx_os_boards_project  ON os_boards  (project_id);
CREATE INDEX IF NOT EXISTS idx_os_boards_tenant   ON os_boards  (tenant_id);
