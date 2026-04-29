-- By Red OS: Thin Core + Placeholders Migration
-- Date: 2026-04-29

-- 1. os_projects
CREATE TABLE IF NOT EXISTS os_projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    archived_at timestamptz,
    UNIQUE(tenant_id, name)
);

-- 2. os_boards
CREATE TABLE IF NOT EXISTS os_boards (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES os_projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    archived_at timestamptz,
    UNIQUE(project_id, name)
);

-- 3. os_phases
CREATE TABLE IF NOT EXISTS os_phases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id uuid NOT NULL REFERENCES os_boards(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    order_index int,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    archived_at timestamptz,
    UNIQUE(board_id, name)
);

-- 4. os_comments (polymorphic)
CREATE TABLE IF NOT EXISTS os_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 5. os_files (polymorphic)
CREATE TABLE IF NOT EXISTS os_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    file_name text NOT NULL,
    file_type text,
    mime_type text,
    storage_provider text,
    storage_path text,
    external_url text,
    uploaded_by_user_id uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 6. os_import_batches
CREATE TABLE IF NOT EXISTS os_import_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_by_user_id uuid NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    metadata jsonb
);

-- 7. os_import_rows
CREATE TABLE IF NOT EXISTS os_import_rows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id uuid NOT NULL REFERENCES os_import_batches(id) ON DELETE CASCADE,
    source_row_hash text NOT NULL,
    data jsonb NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    error_message text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(batch_id, source_row_hash)
);

-- 8. os_entity_links (universal linking)
CREATE TABLE IF NOT EXISTS os_entity_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_entity_type text NOT NULL,
    from_entity_id uuid NOT NULL,
    to_entity_type text NOT NULL,
    to_entity_id uuid NOT NULL,
    link_type text NOT NULL,
    created_at timestamptz DEFAULT now(),
    metadata jsonb
);

-- 9. Placeholder tables (minimal)
CREATE TABLE IF NOT EXISTS os_docs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    metadata jsonb
);

CREATE TABLE IF NOT EXISTS os_companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    metadata jsonb
);

CREATE TABLE IF NOT EXISTS os_contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    metadata jsonb
);

CREATE TABLE IF NOT EXISTS os_ai_threads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    metadata jsonb
);

CREATE TABLE IF NOT EXISTS os_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    metadata jsonb
);

CREATE TABLE IF NOT EXISTS os_integrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    metadata jsonb
);

CREATE TABLE IF NOT EXISTS os_search_index (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    metadata jsonb
);

CREATE TABLE IF NOT EXISTS os_ai_context_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    context_type text,
    context_id uuid,
    created_at timestamptz DEFAULT now(),
    metadata jsonb
);

-- 10. Extend byred_tasks
ALTER TABLE byred_tasks
    ADD COLUMN IF NOT EXISTS project_id uuid,
    ADD COLUMN IF NOT EXISTS board_id uuid,
    ADD COLUMN IF NOT EXISTS phase_id uuid,
    ADD COLUMN IF NOT EXISTS order_index int,
    ADD COLUMN IF NOT EXISTS definition_of_done text,
    ADD COLUMN IF NOT EXISTS acceptance_criteria text,
    ADD COLUMN IF NOT EXISTS source_system text,
    ADD COLUMN IF NOT EXISTS source_id text,
    ADD COLUMN IF NOT EXISTS source_board_name text,
    ADD COLUMN IF NOT EXISTS source_group_name text,
    ADD COLUMN IF NOT EXISTS source_row_hash text,
    ADD COLUMN IF NOT EXISTS import_batch_id uuid,
    ADD COLUMN IF NOT EXISTS is_low_hanging_fruit boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_ready_for_ai boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_ready_for_human boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS needs_decision boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS waiting_on_external boolean DEFAULT false;

-- Foreign keys for new fields (drop-then-add for idempotency)
ALTER TABLE byred_tasks DROP CONSTRAINT IF EXISTS fk_project_id;
ALTER TABLE byred_tasks ADD CONSTRAINT fk_project_id FOREIGN KEY (project_id) REFERENCES os_projects(id) ON DELETE SET NULL;
ALTER TABLE byred_tasks DROP CONSTRAINT IF EXISTS fk_board_id;
ALTER TABLE byred_tasks ADD CONSTRAINT fk_board_id FOREIGN KEY (board_id) REFERENCES os_boards(id) ON DELETE SET NULL;
ALTER TABLE byred_tasks DROP CONSTRAINT IF EXISTS fk_phase_id;
ALTER TABLE byred_tasks ADD CONSTRAINT fk_phase_id FOREIGN KEY (phase_id) REFERENCES os_phases(id) ON DELETE SET NULL;
ALTER TABLE byred_tasks DROP CONSTRAINT IF EXISTS fk_import_batch_id;
ALTER TABLE byred_tasks ADD CONSTRAINT fk_import_batch_id FOREIGN KEY (import_batch_id) REFERENCES os_import_batches(id) ON DELETE SET NULL;

-- ============================================================
-- RLS: os_projects (tenant_id present — same pattern as byred_tasks)
-- ============================================================
ALTER TABLE public.os_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS os_projects_select_member ON public.os_projects;
CREATE POLICY os_projects_select_member ON public.os_projects
  FOR SELECT TO authenticated
  USING (public.byred_is_member_of_tenant(os_projects.tenant_id::uuid));

DROP POLICY IF EXISTS os_projects_insert_member ON public.os_projects;
CREATE POLICY os_projects_insert_member ON public.os_projects
  FOR INSERT TO authenticated
  WITH CHECK (
    public.byred_is_member_of_tenant(os_projects.tenant_id::uuid)
    AND (
      public.byred_jwt_active_tenant_id() IS NULL
      OR os_projects.tenant_id::uuid = public.byred_jwt_active_tenant_id()
    )
  );

DROP POLICY IF EXISTS os_projects_update_admin ON public.os_projects;
CREATE POLICY os_projects_update_admin ON public.os_projects
  FOR UPDATE TO authenticated
  USING (public.byred_is_admin_for_tenant(os_projects.tenant_id::uuid))
  WITH CHECK (public.byred_is_admin_for_tenant(os_projects.tenant_id::uuid));

DROP POLICY IF EXISTS os_projects_delete_admin ON public.os_projects;
CREATE POLICY os_projects_delete_admin ON public.os_projects
  FOR DELETE TO authenticated
  USING (public.byred_is_admin_for_tenant(os_projects.tenant_id::uuid));

-- ============================================================
-- RLS: os_boards (no tenant_id — resolved via os_projects)
-- ============================================================
ALTER TABLE public.os_boards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS os_boards_select_member ON public.os_boards;
CREATE POLICY os_boards_select_member ON public.os_boards
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.os_projects p
      WHERE p.id = os_boards.project_id
        AND public.byred_is_member_of_tenant(p.tenant_id::uuid)
    )
  );

DROP POLICY IF EXISTS os_boards_insert_member ON public.os_boards;
CREATE POLICY os_boards_insert_member ON public.os_boards
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.os_projects p
      WHERE p.id = os_boards.project_id
        AND public.byred_is_member_of_tenant(p.tenant_id::uuid)
    )
  );

DROP POLICY IF EXISTS os_boards_update_admin ON public.os_boards;
CREATE POLICY os_boards_update_admin ON public.os_boards
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.os_projects p
      WHERE p.id = os_boards.project_id
        AND public.byred_is_admin_for_tenant(p.tenant_id::uuid)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.os_projects p
      WHERE p.id = os_boards.project_id
        AND public.byred_is_admin_for_tenant(p.tenant_id::uuid)
    )
  );

DROP POLICY IF EXISTS os_boards_delete_admin ON public.os_boards;
CREATE POLICY os_boards_delete_admin ON public.os_boards
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.os_projects p
      WHERE p.id = os_boards.project_id
        AND public.byred_is_admin_for_tenant(p.tenant_id::uuid)
    )
  );

-- ============================================================
-- RLS: os_phases (resolved through os_boards → os_projects)
-- ============================================================
ALTER TABLE public.os_phases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS os_phases_select_member ON public.os_phases;
CREATE POLICY os_phases_select_member ON public.os_phases
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.os_boards b
      JOIN public.os_projects p ON p.id = b.project_id
      WHERE b.id = os_phases.board_id
        AND public.byred_is_member_of_tenant(p.tenant_id::uuid)
    )
  );

DROP POLICY IF EXISTS os_phases_insert_member ON public.os_phases;
CREATE POLICY os_phases_insert_member ON public.os_phases
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.os_boards b
      JOIN public.os_projects p ON p.id = b.project_id
      WHERE b.id = os_phases.board_id
        AND public.byred_is_member_of_tenant(p.tenant_id::uuid)
    )
  );

DROP POLICY IF EXISTS os_phases_update_admin ON public.os_phases;
CREATE POLICY os_phases_update_admin ON public.os_phases
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.os_boards b
      JOIN public.os_projects p ON p.id = b.project_id
      WHERE b.id = os_phases.board_id
        AND public.byred_is_admin_for_tenant(p.tenant_id::uuid)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.os_boards b
      JOIN public.os_projects p ON p.id = b.project_id
      WHERE b.id = os_phases.board_id
        AND public.byred_is_admin_for_tenant(p.tenant_id::uuid)
    )
  );

DROP POLICY IF EXISTS os_phases_delete_admin ON public.os_phases;
CREATE POLICY os_phases_delete_admin ON public.os_phases
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.os_boards b
      JOIN public.os_projects p ON p.id = b.project_id
      WHERE b.id = os_phases.board_id
        AND public.byred_is_admin_for_tenant(p.tenant_id::uuid)
    )
  );

-- ============================================================
-- RLS: os_comments (user-owned, no tenant_id)
-- ============================================================
ALTER TABLE public.os_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS os_comments_select_authenticated ON public.os_comments;
CREATE POLICY os_comments_select_authenticated ON public.os_comments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS os_comments_insert_owner ON public.os_comments;
CREATE POLICY os_comments_insert_owner ON public.os_comments
  FOR INSERT TO authenticated
  WITH CHECK (os_comments.user_id::uuid = public.byred_current_user_id()::uuid);

DROP POLICY IF EXISTS os_comments_update_owner ON public.os_comments;
CREATE POLICY os_comments_update_owner ON public.os_comments
  FOR UPDATE TO authenticated
  USING (os_comments.user_id::uuid = public.byred_current_user_id()::uuid)
  WITH CHECK (os_comments.user_id::uuid = public.byred_current_user_id()::uuid);

DROP POLICY IF EXISTS os_comments_delete_owner ON public.os_comments;
CREATE POLICY os_comments_delete_owner ON public.os_comments
  FOR DELETE TO authenticated
  USING (os_comments.user_id::uuid = public.byred_current_user_id()::uuid);

-- ============================================================
-- RLS: os_files (tenant_id present)
-- ============================================================
ALTER TABLE public.os_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS os_files_select_member ON public.os_files;
CREATE POLICY os_files_select_member ON public.os_files
  FOR SELECT TO authenticated
  USING (public.byred_is_member_of_tenant(os_files.tenant_id::uuid));

DROP POLICY IF EXISTS os_files_insert_member ON public.os_files;
CREATE POLICY os_files_insert_member ON public.os_files
  FOR INSERT TO authenticated
  WITH CHECK (public.byred_is_member_of_tenant(os_files.tenant_id::uuid));

DROP POLICY IF EXISTS os_files_delete_admin ON public.os_files;
CREATE POLICY os_files_delete_admin ON public.os_files
  FOR DELETE TO authenticated
  USING (public.byred_is_admin_for_tenant(os_files.tenant_id::uuid));

-- ============================================================
-- RLS: os_import_batches (user-owned)
-- ============================================================
ALTER TABLE public.os_import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS os_import_batches_select_owner ON public.os_import_batches;
CREATE POLICY os_import_batches_select_owner ON public.os_import_batches
  FOR SELECT TO authenticated
  USING (os_import_batches.created_by_user_id::uuid = public.byred_current_user_id()::uuid);

DROP POLICY IF EXISTS os_import_batches_insert_owner ON public.os_import_batches;
CREATE POLICY os_import_batches_insert_owner ON public.os_import_batches
  FOR INSERT TO authenticated
  WITH CHECK (os_import_batches.created_by_user_id::uuid = public.byred_current_user_id()::uuid);

-- ============================================================
-- RLS: os_import_rows (via os_import_batches)
-- ============================================================
ALTER TABLE public.os_import_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS os_import_rows_select_owner ON public.os_import_rows;
CREATE POLICY os_import_rows_select_owner ON public.os_import_rows
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.os_import_batches b
      WHERE b.id = os_import_rows.batch_id
        AND b.created_by_user_id::uuid = public.byred_current_user_id()::uuid
    )
  );

DROP POLICY IF EXISTS os_import_rows_insert_owner ON public.os_import_rows;
CREATE POLICY os_import_rows_insert_owner ON public.os_import_rows
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.os_import_batches b
      WHERE b.id = os_import_rows.batch_id
        AND b.created_by_user_id::uuid = public.byred_current_user_id()::uuid
    )
  );

-- ============================================================
-- RLS: os_entity_links (deny authenticated — service role only until wired)
-- ============================================================
ALTER TABLE public.os_entity_links ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS: placeholder tables (deny authenticated — service role only)
-- os_docs, os_companies, os_contacts, os_ai_threads,
-- os_notifications, os_integrations, os_search_index, os_ai_context_links
-- ============================================================
ALTER TABLE public.os_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_ai_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_ai_context_links ENABLE ROW LEVEL SECURITY;
