-- ByRed OS: RLS helper functions and indexes
-- Depends on existing public.byred_current_user_id() from your Supabase schema.
-- User must apply these migrations via Supabase dashboard SQL editor or `supabase db push`.

-- Active tenant from JWT user_metadata (set by the app on tenant switch)
CREATE OR REPLACE FUNCTION public.byred_jwt_active_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v text;
BEGIN
  v := auth.jwt() -> 'user_metadata' ->> 'active_tenant_id';
  IF v IS NULL OR length(trim(v)) = 0 THEN
    RETURN NULL;
  END IF;
  RETURN v::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

-- Membership in a tenant (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.byred_is_member_of_tenant(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.byred_user_tenants ut
    WHERE ut.tenant_id = p_tenant_id
      AND ut.user_id = public.byred_current_user_id()::uuid
  );
$$;

-- Admin role for a tenant from byred_user_tenants.role
CREATE OR REPLACE FUNCTION public.byred_is_admin_for_tenant(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.byred_user_tenants ut
    WHERE ut.tenant_id = p_tenant_id
      AND ut.user_id = public.byred_current_user_id()::uuid
      AND ut.role = 'admin'
  );
$$;

-- Optional: resolve a tenant for rows without tenant_id (daily briefs audit)
CREATE OR REPLACE FUNCTION public.byred_resolve_audit_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_jwt uuid;
  v_tenant uuid;
BEGIN
  v_jwt := public.byred_jwt_active_tenant_id();
  IF v_jwt IS NOT NULL THEN
    RETURN v_jwt;
  END IF;

  v_user := NULLIF(public.byred_current_user_id(), '')::uuid;
  IF v_user IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT ut.tenant_id
  INTO v_tenant
  FROM public.byred_user_tenants ut
  WHERE ut.user_id = v_user
  ORDER BY ut.created_at ASC NULLS LAST
  LIMIT 1;

  RETURN v_tenant;
END;
$$;

-- Indexes for tenant-scoped filters (no CONCURRENTLY: runs inside migration transaction)
CREATE INDEX IF NOT EXISTS byred_tasks_tenant_id_idx ON public.byred_tasks (tenant_id);
CREATE INDEX IF NOT EXISTS byred_leads_tenant_id_idx ON public.byred_leads (tenant_id);
CREATE INDEX IF NOT EXISTS byred_activities_tenant_id_idx ON public.byred_activities (tenant_id);
CREATE INDEX IF NOT EXISTS byred_user_tenants_tenant_id_idx ON public.byred_user_tenants (tenant_id);
CREATE INDEX IF NOT EXISTS byred_user_tenants_user_id_idx ON public.byred_user_tenants (user_id);
