-- RLS: byred_tasks
-- User must apply these migrations via Supabase dashboard SQL editor or `supabase db push`.

ALTER TABLE public.byred_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS byred_tasks_select_member ON public.byred_tasks;
CREATE POLICY byred_tasks_select_member
  ON public.byred_tasks
  FOR SELECT
  TO authenticated
  USING (
    public.byred_is_member_of_tenant(public.byred_tasks.tenant_id::uuid)
  );

DROP POLICY IF EXISTS byred_tasks_insert_member_active_tenant ON public.byred_tasks;
CREATE POLICY byred_tasks_insert_member_active_tenant
  ON public.byred_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.byred_is_member_of_tenant(public.byred_tasks.tenant_id::uuid)
    AND (
      public.byred_jwt_active_tenant_id() IS NULL
      OR public.byred_tasks.tenant_id::uuid = public.byred_jwt_active_tenant_id()
    )
  );

DROP POLICY IF EXISTS byred_tasks_update_member_admin_or_owner ON public.byred_tasks;
CREATE POLICY byred_tasks_update_member_admin_or_owner
  ON public.byred_tasks
  FOR UPDATE
  TO authenticated
  USING (
    public.byred_is_member_of_tenant(public.byred_tasks.tenant_id::uuid)
    AND (
      public.byred_is_admin_for_tenant(public.byred_tasks.tenant_id::uuid)
      OR public.byred_tasks.created_by_user_id::uuid = public.byred_current_user_id()::uuid
      OR public.byred_tasks.owner_user_id::uuid = public.byred_current_user_id()::uuid
    )
  )
  WITH CHECK (
    public.byred_is_member_of_tenant(public.byred_tasks.tenant_id::uuid)
    AND (
      public.byred_is_admin_for_tenant(public.byred_tasks.tenant_id::uuid)
      OR public.byred_tasks.created_by_user_id::uuid = public.byred_current_user_id()::uuid
      OR public.byred_tasks.owner_user_id::uuid = public.byred_current_user_id()::uuid
    )
  );

DROP POLICY IF EXISTS byred_tasks_delete_admin ON public.byred_tasks;
CREATE POLICY byred_tasks_delete_admin
  ON public.byred_tasks
  FOR DELETE
  TO authenticated
  USING (
    public.byred_is_admin_for_tenant(public.byred_tasks.tenant_id::uuid)
  );
