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
    embedding vector(1536),
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

-- Foreign keys for new fields (if referenced tables exist)
ALTER TABLE byred_tasks
    ADD CONSTRAINT IF NOT EXISTS fk_project_id FOREIGN KEY (project_id) REFERENCES os_projects(id) ON DELETE SET NULL,
    ADD CONSTRAINT IF NOT EXISTS fk_board_id FOREIGN KEY (board_id) REFERENCES os_boards(id) ON DELETE SET NULL,
    ADD CONSTRAINT IF NOT EXISTS fk_phase_id FOREIGN KEY (phase_id) REFERENCES os_phases(id) ON DELETE SET NULL,
    ADD CONSTRAINT IF NOT EXISTS fk_import_batch_id FOREIGN KEY (import_batch_id) REFERENCES os_import_batches(id) ON DELETE SET NULL;
