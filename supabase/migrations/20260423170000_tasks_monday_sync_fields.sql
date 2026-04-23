-- Expose Monday sync metadata on byred_tasks so the pull loop can (a) do
-- delta sync via a monotonic cursor and (b) soft-archive tasks that vanish
-- from their Monday board without losing history.

ALTER TABLE public.byred_tasks
  ADD COLUMN IF NOT EXISTS monday_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS monday_synced_at  timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at       timestamptz;

-- Helps the delta sync compute "newest Monday update per tenant" cheaply.
CREATE INDEX IF NOT EXISTS byred_tasks_tenant_monday_updated_at_idx
  ON public.byred_tasks (tenant_id, monday_updated_at DESC)
  WHERE monday_item_id IS NOT NULL;

-- Active-view index (used by UI) that excludes archived tasks.
CREATE INDEX IF NOT EXISTS byred_tasks_tenant_active_idx
  ON public.byred_tasks (tenant_id)
  WHERE archived_at IS NULL;
