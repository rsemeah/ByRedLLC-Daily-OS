-- Audit fn was writing raw TG_TABLE_NAME ("byred_tasks", "byred_tenants", …)
-- into byred_activities.object_type, but the existing CHECK constraint only
-- allowed short names ("task", "lead", …). Result: every INSERT on byred_tasks
-- with a uuid-id tenant blew up on the audit trigger and rolled back the
-- parent transaction. Rewrite the trigger to emit the short form, and widen
-- the check to cover every audited table.

ALTER TABLE public.byred_activities
  DROP CONSTRAINT IF EXISTS byred_activities_object_type_check;

ALTER TABLE public.byred_activities
  ADD CONSTRAINT byred_activities_object_type_check
  CHECK (object_type IN (
    'task',
    'lead',
    'tenant',
    'user',
    'user_tenant',
    'daily_brief'
  ));

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
  v_object_type text;
BEGIN
  v_uid := public.byred_safe_text_to_uuid(
    NULLIF(btrim(COALESCE(public.byred_current_user_id()::text, '')), '')
  );

  v_object_type := CASE TG_TABLE_NAME
    WHEN 'byred_tasks'         THEN 'task'
    WHEN 'byred_leads'         THEN 'lead'
    WHEN 'byred_tenants'       THEN 'tenant'
    WHEN 'byred_users'         THEN 'user'
    WHEN 'byred_user_tenants'  THEN 'user_tenant'
    WHEN 'byred_daily_briefs'  THEN 'daily_brief'
    ELSE TG_TABLE_NAME
  END;

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_new := NULL;
    IF v_old ? 'tenant_id' THEN
      v_tenant := public.byred_safe_text_to_uuid(v_old ->> 'tenant_id');
    ELSE
      v_tenant := public.byred_resolve_audit_tenant_id();
    END IF;
    v_summary := v_object_type || ' deleted';
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    IF v_new ? 'tenant_id' THEN
      v_tenant := public.byred_safe_text_to_uuid(v_new ->> 'tenant_id');
    ELSE
      v_tenant := public.byred_resolve_audit_tenant_id();
    END IF;
    v_summary := v_object_type || ' updated';
  ELSE
    v_old := NULL;
    v_new := to_jsonb(NEW);
    IF v_new ? 'tenant_id' THEN
      v_tenant := public.byred_safe_text_to_uuid(v_new ->> 'tenant_id');
    ELSE
      v_tenant := public.byred_resolve_audit_tenant_id();
    END IF;
    v_summary := v_object_type || ' created';
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
    v_object_type,
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
