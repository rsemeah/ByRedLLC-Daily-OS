-- By Red OS: Calendar Support Migration
-- Date: 2026-04-29

-- 1. Extend byred_tasks with calendar fields (if not already present)
ALTER TABLE byred_tasks
    ADD COLUMN IF NOT EXISTS start_date timestamptz,
    ADD COLUMN IF NOT EXISTS due_date timestamptz,
    ADD COLUMN IF NOT EXISTS completed_at timestamptz,
    ADD COLUMN IF NOT EXISTS calendar_start_at timestamptz,
    ADD COLUMN IF NOT EXISTS calendar_end_at timestamptz,
    ADD COLUMN IF NOT EXISTS all_day boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS recurrence_rule text,
    ADD COLUMN IF NOT EXISTS calendar_color text,
    ADD COLUMN IF NOT EXISTS calendar_label text;

-- 2. os_calendar_events table
CREATE TABLE IF NOT EXISTS os_calendar_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    project_id uuid,
    board_id uuid,
    task_id uuid,
    credential_id uuid,
    title text NOT NULL,
    description text,
    event_type text NOT NULL,
    status text,
    start_at timestamptz NOT NULL,
    end_at timestamptz,
    all_day boolean DEFAULT false,
    timezone text,
    location text,
    owner_user_id uuid,
    related_entity_type text,
    related_entity_id uuid,
    external_provider text,
    external_calendar_id text,
    external_event_id text,
    last_synced_at timestamptz,
    sync_status text,
    sync_error text,
    recurrence_rule text,
    recurrence_parent_id uuid,
    recurrence_exceptions jsonb,
    reminder_minutes int[],
    reminder_at timestamptz[],
    reminder_sent_at timestamptz[],
    reminder_channel text[],
    calendar_color text,
    calendar_label text,
    display_position int,
    order_index int,
    rescheduled_from uuid,
    rescheduled_reason text,
    renewal_required boolean DEFAULT false,
    renewal_status text,
    renewal_owner_user_id uuid,
    visibility text DEFAULT 'private',
    created_by_user_id uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    archived_at timestamptz
);

-- Indexes for filtering
CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_id ON os_calendar_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_project_id ON os_calendar_events(project_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_board_id ON os_calendar_events(board_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_task_id ON os_calendar_events(task_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON os_calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_owner_user_id ON os_calendar_events(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_at ON os_calendar_events(start_at);

-- Event types ENUM (for reference, not enforced in SQL):
-- task, meeting, deadline, renewal, filing, reminder, appointment, external, internal

-- Visibility ENUM (for reference):
-- private, team, client_visible

-- Audit logging to byred_activities must be handled in application logic.
