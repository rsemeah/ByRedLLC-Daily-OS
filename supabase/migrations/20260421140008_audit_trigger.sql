-- Audit trigger: log row changes into byred_activities
-- Does not attach to byred_activities to avoid recursion.
-- User must apply these migrations via Supabase dashboard SQL editor or `supabase db push`.

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
  v_uid := NULLIF(public.byred_current_user_id(), '')::uuid;

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_new := NULL;
    IF v_old ? 'tenant_id' THEN
      v_tenant := (v_old ->> 'tenant_id')::uuid;
    ELSE
      v_tenant := public.byred_resolve_audit_tenant_id();
    END IF;
    v_summary := TG_TABLE_NAME || ' deleted';
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    IF v_new ? 'tenant_id' THEN
      v_tenant := (v_new ->> 'tenant_id')::uuid;
    ELSE
      v_tenant := public.byred_resolve_audit_tenant_id();
    END IF;
    v_summary := TG_TABLE_NAME || ' updated';
  ELSE
    v_old := NULL;
    v_new := to_jsonb(NEW);
    IF v_new ? 'tenant_id' THEN
      v_tenant := (v_new ->> 'tenant_id')::uuid;
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

DROP TRIGGER IF EXISTS byred_audit_byred_tenants ON public.byred_tenants;
CREATE TRIGGER byred_audit_byred_tenants
  AFTER INSERT OR UPDATE OR DELETE ON public.byred_tenants
  FOR EACH ROW
  EXECUTE PROCEDURE public.byred_audit_row_changes();

DROP TRIGGER IF EXISTS byred_audit_byred_users ON public.byred_users;
CREATE TRIGGER byred_audit_byred_users
  AFTER INSERT OR UPDATE OR DELETE ON public.byred_users
  FOR EACH ROW
  EXECUTE PROCEDURE public.byred_audit_row_changes();

DROP TRIGGER IF EXISTS byred_audit_byred_user_tenants ON public.byred_user_tenants;
CREATE TRIGGER byred_audit_byred_user_tenants
  AFTER INSERT OR UPDATE OR DELETE ON public.byred_user_tenants
  FOR EACH ROW
  EXECUTE PROCEDURE public.byred_audit_row_changes();

DROP TRIGGER IF EXISTS byred_audit_byred_tasks ON public.byred_tasks;
CREATE TRIGGER byred_audit_byred_tasks
  AFTER INSERT OR UPDATE OR DELETE ON public.byred_tasks
  FOR EACH ROW
  EXECUTE PROCEDURE public.byred_audit_row_changes();

DROP TRIGGER IF EXISTS byred_audit_byred_leads ON public.byred_leads;
CREATE TRIGGER byred_audit_byred_leads
  AFTER INSERT OR UPDATE OR DELETE ON public.byred_leads
  FOR EACH ROW
  EXECUTE PROCEDURE public.byred_audit_row_changes();

DROP TRIGGER IF EXISTS byred_audit_byred_daily_briefs ON public.byred_daily_briefs;
CREATE TRIGGER byred_audit_byred_daily_briefs
  AFTER INSERT OR UPDATE OR DELETE ON public.byred_daily_briefs
  FOR EACH ROW
  EXECUTE PROCEDURE public.byred_audit_row_changes();
