-- Close the V1 loop end-to-end. The previous migration
-- (20260426120000_byred_daily_briefs_no_global_select.sql) added owner-only
-- policies but did not drop two pre-existing legacy policies that live in
-- the production database outside the local migration history:
--
--   * briefs_read_global_or_own — SELECT USING ((user_id IS NULL) OR
--     (user_id = byred_current_user_id())). Re-opens the cross-tenant leak.
--   * briefs_admin_manage      — FOR ALL USING (byred_is_admin()). The
--     bootstrap trigger sets byred_users.role = 'admin' for every signup,
--     so this grants every authenticated user full read/write/delete.
--
-- Postgres RLS evaluates permissive policies as a logical OR: as long as
-- either of these legacy policies stays, the new owner-only policies have
-- no effect.

ALTER TABLE public.byred_daily_briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS briefs_read_global_or_own ON public.byred_daily_briefs;
DROP POLICY IF EXISTS briefs_admin_manage      ON public.byred_daily_briefs;
