-- RLS: byred_users (no tenant_id column; access via shared byred_user_tenants)
-- User must apply these migrations via Supabase dashboard SQL editor or `supabase db push`.

ALTER TABLE public.byred_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS byred_users_select_self_or_peer ON public.byred_users;
CREATE POLICY byred_users_select_self_or_peer
  ON public.byred_users
  FOR SELECT
  TO authenticated
  USING (
    public.byred_users.id = public.byred_current_user_id()::uuid
    OR EXISTS (
      SELECT 1
      FROM public.byred_user_tenants me
      INNER JOIN public.byred_user_tenants peer
        ON peer.tenant_id = me.tenant_id
      WHERE me.user_id = public.byred_current_user_id()::uuid
        AND peer.user_id = public.byred_users.id
    )
  );

DROP POLICY IF EXISTS byred_users_insert_self ON public.byred_users;
CREATE POLICY byred_users_insert_self
  ON public.byred_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.byred_users.auth_user_id = auth.uid()
  );

DROP POLICY IF EXISTS byred_users_update_self_or_admin_peer ON public.byred_users;
CREATE POLICY byred_users_update_self_or_admin_peer
  ON public.byred_users
  FOR UPDATE
  TO authenticated
  USING (
    public.byred_users.id = public.byred_current_user_id()::uuid
    OR EXISTS (
      SELECT 1
      FROM public.byred_user_tenants me
      INNER JOIN public.byred_user_tenants peer
        ON peer.tenant_id = me.tenant_id
      WHERE me.user_id = public.byred_current_user_id()::uuid
        AND me.role = 'admin'
        AND peer.user_id = public.byred_users.id
    )
  )
  WITH CHECK (
    public.byred_users.id = public.byred_current_user_id()::uuid
    OR EXISTS (
      SELECT 1
      FROM public.byred_user_tenants me
      INNER JOIN public.byred_user_tenants peer
        ON peer.tenant_id = me.tenant_id
      WHERE me.user_id = public.byred_current_user_id()::uuid
        AND me.role = 'admin'
        AND peer.user_id = public.byred_users.id
    )
  );

DROP POLICY IF EXISTS byred_users_delete_admin_peer ON public.byred_users;
CREATE POLICY byred_users_delete_admin_peer
  ON public.byred_users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.byred_user_tenants me
      INNER JOIN public.byred_user_tenants peer
        ON peer.tenant_id = me.tenant_id
      WHERE me.user_id = public.byred_current_user_id()::uuid
        AND me.role = 'admin'
        AND peer.user_id = public.byred_users.id
    )
  );
