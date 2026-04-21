-- RLS: byred_daily_briefs (no tenant_id column; scope by user_id)
-- User must apply these migrations via Supabase dashboard SQL editor or `supabase db push`.

ALTER TABLE public.byred_daily_briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS byred_daily_briefs_select_own_or_global ON public.byred_daily_briefs;
CREATE POLICY byred_daily_briefs_select_own_or_global
  ON public.byred_daily_briefs
  FOR SELECT
  TO authenticated
  USING (
    public.byred_daily_briefs.user_id IS NULL
    OR public.byred_daily_briefs.user_id = public.byred_current_user_id()::uuid
  );

DROP POLICY IF EXISTS byred_daily_briefs_insert_own_or_global_admin ON public.byred_daily_briefs;
CREATE POLICY byred_daily_briefs_insert_own_or_global_admin
  ON public.byred_daily_briefs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.byred_daily_briefs.user_id = public.byred_current_user_id()::uuid
    OR (
      public.byred_daily_briefs.user_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.byred_users u
        WHERE u.id = public.byred_current_user_id()::uuid
          AND u.role = 'admin'
      )
    )
  );

DROP POLICY IF EXISTS byred_daily_briefs_update_own_or_global_admin ON public.byred_daily_briefs;
CREATE POLICY byred_daily_briefs_update_own_or_global_admin
  ON public.byred_daily_briefs
  FOR UPDATE
  TO authenticated
  USING (
    (
      public.byred_daily_briefs.user_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.byred_users u
        WHERE u.id = public.byred_current_user_id()::uuid
          AND u.role = 'admin'
      )
    )
    OR public.byred_daily_briefs.user_id = public.byred_current_user_id()::uuid
  )
  WITH CHECK (
    (
      public.byred_daily_briefs.user_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.byred_users u
        WHERE u.id = public.byred_current_user_id()::uuid
          AND u.role = 'admin'
      )
    )
    OR public.byred_daily_briefs.user_id = public.byred_current_user_id()::uuid
  );

DROP POLICY IF EXISTS byred_daily_briefs_delete_own_or_global_admin ON public.byred_daily_briefs;
CREATE POLICY byred_daily_briefs_delete_own_or_global_admin
  ON public.byred_daily_briefs
  FOR DELETE
  TO authenticated
  USING (
    (
      public.byred_daily_briefs.user_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.byred_users u
        WHERE u.id = public.byred_current_user_id()::uuid
          AND u.role = 'admin'
      )
    )
    OR public.byred_daily_briefs.user_id = public.byred_current_user_id()::uuid
  );
