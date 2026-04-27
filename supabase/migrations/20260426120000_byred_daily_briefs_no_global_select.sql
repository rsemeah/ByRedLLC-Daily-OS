-- Tenant-isolation fix: the previous SELECT policy on byred_daily_briefs
-- granted every authenticated user visibility into rows where user_id IS NULL
-- (the "global" daily brief). The cron-generated global brief aggregates the
-- top-priority tasks/leads across every tenant and stores their id, title,
-- tenant_id, due_date, and priority in the summary JSONB. With the old policy
-- any signed-in user could read another tenant's task titles via that row.
--
-- This migration scopes SELECT to the row owner only (user_id = current user).
-- Global rows continue to exist as cron telemetry / future per-user fan-out
-- inputs but are no longer reachable from the authenticated app role. The
-- service-role key (cron, generation pipeline) bypasses RLS and keeps working.
--
-- The byred_users.role = 'admin' check used in the prior insert/update/delete
-- policies is also unreliable as a privilege gate because the bootstrap
-- trigger (20260421160000_auth_bootstrap_tenant.sql) sets role='admin' on
-- every new signup. Mutating policies are therefore tightened to the row
-- owner only as well; cron writes use the service role.

ALTER TABLE public.byred_daily_briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS byred_daily_briefs_select_own_or_global ON public.byred_daily_briefs;
DROP POLICY IF EXISTS byred_daily_briefs_select_own ON public.byred_daily_briefs;
CREATE POLICY byred_daily_briefs_select_own
  ON public.byred_daily_briefs
  FOR SELECT
  TO authenticated
  USING (
    public.byred_daily_briefs.user_id::uuid = public.byred_current_user_id()::uuid
  );

DROP POLICY IF EXISTS byred_daily_briefs_insert_own_or_global_admin ON public.byred_daily_briefs;
DROP POLICY IF EXISTS byred_daily_briefs_insert_own ON public.byred_daily_briefs;
CREATE POLICY byred_daily_briefs_insert_own
  ON public.byred_daily_briefs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.byred_daily_briefs.user_id::uuid = public.byred_current_user_id()::uuid
  );

DROP POLICY IF EXISTS byred_daily_briefs_update_own_or_global_admin ON public.byred_daily_briefs;
DROP POLICY IF EXISTS byred_daily_briefs_update_own ON public.byred_daily_briefs;
CREATE POLICY byred_daily_briefs_update_own
  ON public.byred_daily_briefs
  FOR UPDATE
  TO authenticated
  USING (
    public.byred_daily_briefs.user_id::uuid = public.byred_current_user_id()::uuid
  )
  WITH CHECK (
    public.byred_daily_briefs.user_id::uuid = public.byred_current_user_id()::uuid
  );

DROP POLICY IF EXISTS byred_daily_briefs_delete_own_or_global_admin ON public.byred_daily_briefs;
DROP POLICY IF EXISTS byred_daily_briefs_delete_own ON public.byred_daily_briefs;
CREATE POLICY byred_daily_briefs_delete_own
  ON public.byred_daily_briefs
  FOR DELETE
  TO authenticated
  USING (
    public.byred_daily_briefs.user_id::uuid = public.byred_current_user_id()::uuid
  );
