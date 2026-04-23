-- Normalize tenant ids to uuid across the entire schema.
--
-- Background: early seed migrations inserted text tenant ids (t1..t4) alongside
-- gen_random_uuid() rows. Every tenant-bearing column is currently `text`, and
-- the audit trigger silently skipped the short-id tenants because the uuid cast
-- failed. This migration makes the schema uniform: every id/tenant_id is a
-- real uuid, every FK is ON UPDATE/DELETE CASCADE, every policy survives.
--
-- Steps: drop RLS policies that depend on the column types → rewrite values
-- → alter types → re-install FKs with cascade → re-create identical policies
-- (the existing `::uuid` casts become uuid→uuid no-ops, which is legal). One
-- transaction, all-or-nothing.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Drop RLS policies that reference id / tenant_id columns we need to alter.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS byred_tenants_select_member              ON public.byred_tenants;
DROP POLICY IF EXISTS byred_tenants_insert_global_admin        ON public.byred_tenants;
DROP POLICY IF EXISTS byred_tenants_update_admin               ON public.byred_tenants;
DROP POLICY IF EXISTS byred_tenants_delete_admin               ON public.byred_tenants;

DROP POLICY IF EXISTS byred_users_select_self_or_peer          ON public.byred_users;
DROP POLICY IF EXISTS byred_users_insert_self                  ON public.byred_users;
DROP POLICY IF EXISTS byred_users_update_self_or_admin_peer    ON public.byred_users;
DROP POLICY IF EXISTS byred_users_delete_admin_peer            ON public.byred_users;

DROP POLICY IF EXISTS byred_user_tenants_select_member         ON public.byred_user_tenants;
DROP POLICY IF EXISTS byred_user_tenants_insert_admin          ON public.byred_user_tenants;
DROP POLICY IF EXISTS byred_user_tenants_update_admin          ON public.byred_user_tenants;
DROP POLICY IF EXISTS byred_user_tenants_delete_admin          ON public.byred_user_tenants;

DROP POLICY IF EXISTS byred_tasks_select_member                ON public.byred_tasks;
DROP POLICY IF EXISTS byred_tasks_insert_member_active_tenant  ON public.byred_tasks;
DROP POLICY IF EXISTS byred_tasks_update_member_admin_or_owner ON public.byred_tasks;
DROP POLICY IF EXISTS byred_tasks_delete_admin                 ON public.byred_tasks;

DROP POLICY IF EXISTS byred_leads_select_member                ON public.byred_leads;
DROP POLICY IF EXISTS byred_leads_insert_member_active_tenant  ON public.byred_leads;
DROP POLICY IF EXISTS byred_leads_update_member_admin_or_owner ON public.byred_leads;
DROP POLICY IF EXISTS byred_leads_delete_admin                 ON public.byred_leads;

DROP POLICY IF EXISTS byred_activities_select_member                   ON public.byred_activities;
DROP POLICY IF EXISTS byred_activities_insert_member                   ON public.byred_activities;
DROP POLICY IF EXISTS byred_activities_update_member_admin_or_actor    ON public.byred_activities;
DROP POLICY IF EXISTS byred_activities_delete_admin                    ON public.byred_activities;

-- ---------------------------------------------------------------------------
-- 2. Build rewrite map for every non-uuid tenant id.
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE _tenant_rewrite
ON COMMIT DROP
AS
SELECT
  id AS old_id,
  gen_random_uuid()::text AS new_id
FROM public.byred_tenants
WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- ---------------------------------------------------------------------------
-- 3. Drop FK constraints so parent ids can be rewritten.
-- ---------------------------------------------------------------------------

ALTER TABLE public.byred_user_tenants DROP CONSTRAINT IF EXISTS byred_user_tenants_tenant_id_fkey;
ALTER TABLE public.byred_tasks        DROP CONSTRAINT IF EXISTS byred_tasks_tenant_id_fkey;
ALTER TABLE public.byred_activities   DROP CONSTRAINT IF EXISTS byred_activities_tenant_id_fkey;
ALTER TABLE public.byred_leads        DROP CONSTRAINT IF EXISTS byred_leads_tenant_id_fkey;

-- ---------------------------------------------------------------------------
-- 4. Rewrite child rows before parent.
-- ---------------------------------------------------------------------------

UPDATE public.byred_user_tenants ut
SET tenant_id = r.new_id
FROM _tenant_rewrite r
WHERE ut.tenant_id = r.old_id;

UPDATE public.byred_tasks t
SET tenant_id = r.new_id
FROM _tenant_rewrite r
WHERE t.tenant_id = r.old_id;

UPDATE public.byred_activities a
SET tenant_id = r.new_id
FROM _tenant_rewrite r
WHERE a.tenant_id = r.old_id;

UPDATE public.byred_leads l
SET tenant_id = r.new_id
FROM _tenant_rewrite r
WHERE l.tenant_id = r.old_id;

-- ---------------------------------------------------------------------------
-- 5. Rewrite parent ids.
-- ---------------------------------------------------------------------------

UPDATE public.byred_tenants t
SET id = r.new_id
FROM _tenant_rewrite r
WHERE t.id = r.old_id;

-- ---------------------------------------------------------------------------
-- 6. Convert column types to uuid.
-- ---------------------------------------------------------------------------

ALTER TABLE public.byred_tenants      ALTER COLUMN id        TYPE uuid USING id::uuid;
ALTER TABLE public.byred_user_tenants ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE public.byred_tasks        ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE public.byred_activities   ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE public.byred_leads        ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;

-- ---------------------------------------------------------------------------
-- 7. Re-install FKs with ON UPDATE/DELETE CASCADE.
-- ---------------------------------------------------------------------------

ALTER TABLE public.byred_user_tenants
  ADD CONSTRAINT byred_user_tenants_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.byred_tenants(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.byred_tasks
  ADD CONSTRAINT byred_tasks_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.byred_tenants(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.byred_activities
  ADD CONSTRAINT byred_activities_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.byred_tenants(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.byred_leads
  ADD CONSTRAINT byred_leads_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.byred_tenants(id)
  ON UPDATE CASCADE ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 8. Re-create RLS policies (identical to original files; uuid::uuid casts
--    remain because they are legal and keep the policies portable if a future
--    column type ever drifts).
-- ---------------------------------------------------------------------------

-- byred_tenants -------------------------------------------------------------

CREATE POLICY byred_tenants_select_member
  ON public.byred_tenants FOR SELECT TO authenticated
  USING (public.byred_is_member_of_tenant(public.byred_tenants.id::uuid));

CREATE POLICY byred_tenants_insert_global_admin
  ON public.byred_tenants FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.byred_users u
      WHERE u.id::uuid = public.byred_current_user_id()::uuid
        AND u.role = 'admin'
    )
  );

CREATE POLICY byred_tenants_update_admin
  ON public.byred_tenants FOR UPDATE TO authenticated
  USING (public.byred_is_admin_for_tenant(public.byred_tenants.id::uuid))
  WITH CHECK (public.byred_is_admin_for_tenant(public.byred_tenants.id::uuid));

CREATE POLICY byred_tenants_delete_admin
  ON public.byred_tenants FOR DELETE TO authenticated
  USING (public.byred_is_admin_for_tenant(public.byred_tenants.id::uuid));

-- byred_users ---------------------------------------------------------------

CREATE POLICY byred_users_select_self_or_peer
  ON public.byred_users FOR SELECT TO authenticated
  USING (
    public.byred_users.id::uuid = public.byred_current_user_id()::uuid
    OR EXISTS (
      SELECT 1
      FROM public.byred_user_tenants me
      INNER JOIN public.byred_user_tenants peer
        ON peer.tenant_id::uuid = me.tenant_id::uuid
      WHERE me.user_id::uuid = public.byred_current_user_id()::uuid
        AND peer.user_id::uuid = public.byred_users.id::uuid
    )
  );

CREATE POLICY byred_users_insert_self
  ON public.byred_users FOR INSERT TO authenticated
  WITH CHECK (public.byred_users.auth_user_id = auth.uid());

CREATE POLICY byred_users_update_self_or_admin_peer
  ON public.byred_users FOR UPDATE TO authenticated
  USING (
    public.byred_users.id::uuid = public.byred_current_user_id()::uuid
    OR EXISTS (
      SELECT 1
      FROM public.byred_user_tenants me
      INNER JOIN public.byred_user_tenants peer
        ON peer.tenant_id::uuid = me.tenant_id::uuid
      WHERE me.user_id::uuid = public.byred_current_user_id()::uuid
        AND me.role = 'admin'
        AND peer.user_id::uuid = public.byred_users.id::uuid
    )
  )
  WITH CHECK (
    public.byred_users.id::uuid = public.byred_current_user_id()::uuid
    OR EXISTS (
      SELECT 1
      FROM public.byred_user_tenants me
      INNER JOIN public.byred_user_tenants peer
        ON peer.tenant_id::uuid = me.tenant_id::uuid
      WHERE me.user_id::uuid = public.byred_current_user_id()::uuid
        AND me.role = 'admin'
        AND peer.user_id::uuid = public.byred_users.id::uuid
    )
  );

CREATE POLICY byred_users_delete_admin_peer
  ON public.byred_users FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.byred_user_tenants me
      INNER JOIN public.byred_user_tenants peer
        ON peer.tenant_id::uuid = me.tenant_id::uuid
      WHERE me.user_id::uuid = public.byred_current_user_id()::uuid
        AND me.role = 'admin'
        AND peer.user_id::uuid = public.byred_users.id::uuid
    )
  );

-- byred_user_tenants --------------------------------------------------------

CREATE POLICY byred_user_tenants_select_member
  ON public.byred_user_tenants FOR SELECT TO authenticated
  USING (public.byred_is_member_of_tenant(public.byred_user_tenants.tenant_id::uuid));

CREATE POLICY byred_user_tenants_insert_admin
  ON public.byred_user_tenants FOR INSERT TO authenticated
  WITH CHECK (
    public.byred_is_admin_for_tenant(public.byred_user_tenants.tenant_id::uuid)
    AND (
      public.byred_jwt_active_tenant_id() IS NULL
      OR public.byred_user_tenants.tenant_id::uuid = public.byred_jwt_active_tenant_id()
    )
  );

CREATE POLICY byred_user_tenants_update_admin
  ON public.byred_user_tenants FOR UPDATE TO authenticated
  USING (public.byred_is_admin_for_tenant(public.byred_user_tenants.tenant_id::uuid))
  WITH CHECK (public.byred_is_admin_for_tenant(public.byred_user_tenants.tenant_id::uuid));

CREATE POLICY byred_user_tenants_delete_admin
  ON public.byred_user_tenants FOR DELETE TO authenticated
  USING (public.byred_is_admin_for_tenant(public.byred_user_tenants.tenant_id::uuid));

-- byred_tasks ---------------------------------------------------------------

CREATE POLICY byred_tasks_select_member
  ON public.byred_tasks FOR SELECT TO authenticated
  USING (public.byred_is_member_of_tenant(public.byred_tasks.tenant_id::uuid));

CREATE POLICY byred_tasks_insert_member_active_tenant
  ON public.byred_tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.byred_is_member_of_tenant(public.byred_tasks.tenant_id::uuid)
    AND (
      public.byred_jwt_active_tenant_id() IS NULL
      OR public.byred_tasks.tenant_id::uuid = public.byred_jwt_active_tenant_id()
    )
  );

CREATE POLICY byred_tasks_update_member_admin_or_owner
  ON public.byred_tasks FOR UPDATE TO authenticated
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

CREATE POLICY byred_tasks_delete_admin
  ON public.byred_tasks FOR DELETE TO authenticated
  USING (public.byred_is_admin_for_tenant(public.byred_tasks.tenant_id::uuid));

-- byred_leads ---------------------------------------------------------------

CREATE POLICY byred_leads_select_member
  ON public.byred_leads FOR SELECT TO authenticated
  USING (public.byred_is_member_of_tenant(public.byred_leads.tenant_id::uuid));

CREATE POLICY byred_leads_insert_member_active_tenant
  ON public.byred_leads FOR INSERT TO authenticated
  WITH CHECK (
    public.byred_is_member_of_tenant(public.byred_leads.tenant_id::uuid)
    AND (
      public.byred_jwt_active_tenant_id() IS NULL
      OR public.byred_leads.tenant_id::uuid = public.byred_jwt_active_tenant_id()
    )
  );

CREATE POLICY byred_leads_update_member_admin_or_owner
  ON public.byred_leads FOR UPDATE TO authenticated
  USING (
    public.byred_is_member_of_tenant(public.byred_leads.tenant_id::uuid)
    AND (
      public.byred_is_admin_for_tenant(public.byred_leads.tenant_id::uuid)
      OR public.byred_leads.created_by_user_id::uuid = public.byred_current_user_id()::uuid
      OR public.byred_leads.assigned_user_id::uuid = public.byred_current_user_id()::uuid
    )
  )
  WITH CHECK (
    public.byred_is_member_of_tenant(public.byred_leads.tenant_id::uuid)
    AND (
      public.byred_is_admin_for_tenant(public.byred_leads.tenant_id::uuid)
      OR public.byred_leads.created_by_user_id::uuid = public.byred_current_user_id()::uuid
      OR public.byred_leads.assigned_user_id::uuid = public.byred_current_user_id()::uuid
    )
  );

CREATE POLICY byred_leads_delete_admin
  ON public.byred_leads FOR DELETE TO authenticated
  USING (public.byred_is_admin_for_tenant(public.byred_leads.tenant_id::uuid));

-- byred_activities ----------------------------------------------------------

CREATE POLICY byred_activities_select_member
  ON public.byred_activities FOR SELECT TO authenticated
  USING (public.byred_is_member_of_tenant(public.byred_activities.tenant_id::uuid));

CREATE POLICY byred_activities_insert_member
  ON public.byred_activities FOR INSERT TO authenticated
  WITH CHECK (
    public.byred_is_member_of_tenant(public.byred_activities.tenant_id::uuid)
    AND (
      public.byred_jwt_active_tenant_id() IS NULL
      OR public.byred_activities.tenant_id::uuid = public.byred_jwt_active_tenant_id()
    )
  );

CREATE POLICY byred_activities_update_member_admin_or_actor
  ON public.byred_activities FOR UPDATE TO authenticated
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

CREATE POLICY byred_activities_delete_admin
  ON public.byred_activities FOR DELETE TO authenticated
  USING (public.byred_is_admin_for_tenant(public.byred_activities.tenant_id::uuid));

COMMIT;
