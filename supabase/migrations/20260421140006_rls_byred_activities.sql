-- RLS: byred_activities
-- User must apply these migrations via Supabase dashboard SQL editor or `supabase db push`.

ALTER TABLE public.byred_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS byred_activities_select_member ON public.byred_activities;
CREATE POLICY byred_activities_select_member
  ON public.byred_activities
  FOR SELECT
  TO authenticated
  USING (
    public.byred_is_member_of_tenant(public.byred_activities.tenant_id::uuid)
  );

-- Inserts from the app: any tenant member may log activity in their tenant
DROP POLICY IF EXISTS byred_activities_insert_member ON public.byred_activities;
CREATE POLICY byred_activities_insert_member
  ON public.byred_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.byred_is_member_of_tenant(public.byred_activities.tenant_id::uuid)
    AND (
      public.byred_jwt_active_tenant_id() IS NULL
      OR public.byred_activities.tenant_id::uuid = public.byred_jwt_active_tenant_id()
    )
  );

DROP POLICY IF EXISTS byred_activities_update_member_admin_or_actor ON public.byred_activities;
CREATE POLICY byred_activities_update_member_admin_or_actor
  ON public.byred_activities
  FOR UPDATE
  TO authenticated
  USING (
    public.byred_is_member_of_tenant(public.byred_activities.tenant_id::uuid)
    AND (
      public.byred_is_admin_for_tenant(public.byred_activities.tenant_id::uuid)
      OR public.byred_activities.user_id::uuid = public.byred_current_user_id()::uuid
    )
  )
  WITH CHECK (
    public.byred_is_member_of_tenant(public.byred_activities.tenant_id::uuid)
    AND (
      public.byred_is_admin_for_tenant(public.byred_activities.tenant_id::uuid)
      OR public.byred_activities.user_id::uuid = public.byred_current_user_id()::uuid
    )
  );

DROP POLICY IF EXISTS byred_activities_delete_admin ON public.byred_activities;
CREATE POLICY byred_activities_delete_admin
  ON public.byred_activities
  FOR DELETE
  TO authenticated
  USING (
    public.byred_is_admin_for_tenant(public.byred_activities.tenant_id::uuid)
  );
