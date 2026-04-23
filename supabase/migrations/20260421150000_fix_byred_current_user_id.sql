/* One-shot fix for 22P02 "invalid input syntax for type uuid: """ on byred_users seed:
   1) byred_current_user_id: never return ''
   2) byred_safe_text_to_uuid: (jsonb->>'*') and text never cast '' to uuid
   3) byred_resolve_audit_tenant_id: safe uid cast (define before audit trigger)
   4) byred_audit_row_changes: use safe helper for tenant_id (AFTER trigger runs in same xact)
*/

CREATE OR REPLACE FUNCTION public.byred_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.byred_safe_text_to_uuid(p text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p IS NULL OR btrim(p) = '' THEN
    RETURN NULL;
  END IF;
  RETURN p::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$$;

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

  v_user := public.byred_safe_text_to_uuid(
    NULLIF(btrim(COALESCE(public.byred_current_user_id()::text, '')), '')
  );
  IF v_user IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT ut.tenant_id::uuid
  INTO v_tenant
  FROM public.byred_user_tenants ut
  WHERE ut.user_id::uuid = v_user
  ORDER BY ut.created_at ASC NULLS LAST
  LIMIT 1;

  RETURN v_tenant;
END;
$$;

CREATE OR REPLACE FUNCTION public.byred_audit_row_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_tenant uuid;
  v_summary text;
  v_meta jsonb;
  v_old jsonb;
  v_new jsonb;
BEGIN
  v_uid := public.byred_safe_text_to_uuid(
    NULLIF(btrim(COALESCE(public.byred_current_user_id()::text, '')), '')
  );

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_new := NULL;
    IF v_old ? 'tenant_id' THEN
      v_tenant := public.byred_safe_text_to_uuid(v_old ->> 'tenant_id');
    ELSE
      v_tenant := public.byred_resolve_audit_tenant_id();
    END IF;
    v_summary := TG_TABLE_NAME || ' deleted';
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    IF v_new ? 'tenant_id' THEN
      v_tenant := public.byred_safe_text_to_uuid(v_new ->> 'tenant_id');
    ELSE
      v_tenant := public.byred_resolve_audit_tenant_id();
    END IF;
    v_summary := TG_TABLE_NAME || ' updated';
  ELSE
    v_old := NULL;
    v_new := to_jsonb(NEW);
    IF v_new ? 'tenant_id' THEN
      v_tenant := public.byred_safe_text_to_uuid(v_new ->> 'tenant_id');
    ELSE
      v_tenant := public.byred_resolve_audit_tenant_id();
    END IF;
    v_summary := TG_TABLE_NAME || ' created';
  END IF;

  IF v_tenant IS NULL THEN
    RAISE WARNING 'byred_audit_row_changes: could not resolve tenant_id for %', TG_TABLE_NAME;
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_meta := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'op', TG_OP,
    'old', v_old,
    'new', v_new
  );

  INSERT INTO public.byred_activities (
    tenant_id,
    object_type,
    object_id,
    user_id,
    type,
    summary,
    metadata
  )
  VALUES (
    v_tenant,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    v_uid,
    CASE TG_OP
      WHEN 'INSERT' THEN 'audit_created'
      WHEN 'UPDATE' THEN 'audit_updated'
      WHEN 'DELETE' THEN 'audit_deleted'
      ELSE 'audit_unknown'
    END,
    left(v_summary, 500),
    v_meta
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;
