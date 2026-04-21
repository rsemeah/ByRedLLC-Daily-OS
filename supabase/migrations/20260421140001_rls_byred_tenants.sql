-- RLS: byred_tenants
-- User must apply these migrations via Supabase dashboard SQL editor or `supabase db push`.

ALTER TABLE public.byred_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS byred_tenants_select_member ON public.byred_tenants;
CREATE POLICY byred_tenants_select_member
  ON public.byred_tenants
  FOR SELECT
  TO authenticated
  USING (
    public.byred_is_member_of_tenant(public.byred_tenants.id::uuid)
  );

DROP POLICY IF EXISTS byred_tenants_insert_global_admin ON public.byred_tenants;
CREATE POLICY byred_tenants_insert_global_admin
  ON public.byred_tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.byred_users u
      WHERE u.id::uuid = public.byred_current_user_id()::uuid
        AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS byred_tenants_update_admin ON public.byred_tenants;
CREATE POLICY byred_tenants_update_admin
  ON public.byred_tenants
  FOR UPDATE
  TO authenticated
  USING (public.byred_is_admin_for_tenant(public.byred_tenants.id::uuid))
  WITH CHECK (public.byred_is_admin_for_tenant(public.byred_tenants.id::uuid));

DROP POLICY IF EXISTS byred_tenants_delete_admin ON public.byred_tenants;
CREATE POLICY byred_tenants_delete_admin
  ON public.byred_tenants
  FOR DELETE
  TO authenticated
  USING (public.byred_is_admin_for_tenant(public.byred_tenants.id::uuid));
