-- RLS: byred_user_tenants
-- User must apply these migrations via Supabase dashboard SQL editor or `supabase db push`.

ALTER TABLE public.byred_user_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS byred_user_tenants_select_member ON public.byred_user_tenants;
CREATE POLICY byred_user_tenants_select_member
  ON public.byred_user_tenants
  FOR SELECT
  TO authenticated
  USING (
    public.byred_is_member_of_tenant(public.byred_user_tenants.tenant_id)
  );

DROP POLICY IF EXISTS byred_user_tenants_insert_admin ON public.byred_user_tenants;
CREATE POLICY byred_user_tenants_insert_admin
  ON public.byred_user_tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.byred_is_admin_for_tenant(public.byred_user_tenants.tenant_id)
    AND (
      public.byred_jwt_active_tenant_id() IS NULL
      OR public.byred_user_tenants.tenant_id = public.byred_jwt_active_tenant_id()
    )
  );

DROP POLICY IF EXISTS byred_user_tenants_update_admin ON public.byred_user_tenants;
CREATE POLICY byred_user_tenants_update_admin
  ON public.byred_user_tenants
  FOR UPDATE
  TO authenticated
  USING (public.byred_is_admin_for_tenant(public.byred_user_tenants.tenant_id))
  WITH CHECK (public.byred_is_admin_for_tenant(public.byred_user_tenants.tenant_id));

DROP POLICY IF EXISTS byred_user_tenants_delete_admin ON public.byred_user_tenants;
CREATE POLICY byred_user_tenants_delete_admin
  ON public.byred_user_tenants
  FOR DELETE
  TO authenticated
  USING (public.byred_is_admin_for_tenant(public.byred_user_tenants.tenant_id));
