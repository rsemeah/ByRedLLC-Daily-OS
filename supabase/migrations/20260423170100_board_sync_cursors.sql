-- Per-tenant / per-board delta cursor. Records the Monday `updated_at` of
-- the most recent item seen on the previous pull so the next pull can ask
-- Monday for rows `updated_at > cursor` only. Cuts cron load from O(N items)
-- to O(delta items) per run.

CREATE TABLE IF NOT EXISTS public.byred_board_sync_cursors (
  tenant_id uuid NOT NULL REFERENCES public.byred_tenants(id) ON UPDATE CASCADE ON DELETE CASCADE,
  board_id  text NOT NULL,
  cursor_updated_at timestamptz,
  last_full_sync_at timestamptz,
  last_delta_sync_at timestamptz,
  PRIMARY KEY (tenant_id, board_id)
);

ALTER TABLE public.byred_board_sync_cursors ENABLE ROW LEVEL SECURITY;
-- service_role only; RLS deny-by-default is sufficient.
