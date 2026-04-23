-- On new Supabase auth user, create: tenant + byred_users profile + admin membership.
-- RLS would otherwise block new users (no tenant role yet). This runs as SECURITY DEFINER.
-- Apply in Supabase SQL editor if auth schema triggers are not applied via CLI.
--
-- If anything fails, we log a WARNING and return NEW so sign-up is not rolled back; the app
-- can show /onboarding until an admin or repair run fixes data.

CREATE OR REPLACE FUNCTION public.byred_bootstrap_user_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_user_id uuid;
  v_email text;
  v_name text;
  v_org text;
  v_tenant_name text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.byred_users bu
    WHERE bu.auth_user_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  v_email := btrim(NEW.email);
  IF v_email IS NULL OR v_email = '' THEN
    RAISE WARNING 'byred_bootstrap: auth user % has no email; skip bootstrap', NEW.id;
    RETURN NEW;
  END IF;

  v_name := btrim(
    coalesce(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'User')
  );
  v_org := btrim(coalesce(NEW.raw_user_meta_data->>'org_name', ''));

  v_tenant_id := gen_random_uuid();
  v_user_id := gen_random_uuid();
  v_tenant_name := left(
    CASE
      WHEN v_org != '' THEN v_org
      ELSE v_name || '''s workspace'
    END,
    120
  );

  INSERT INTO public.byred_tenants (
    id,
    name,
    type,
    color,
    active
  )
  VALUES (
    v_tenant_id,
    v_tenant_name,
    'service',
    '#d90009',
    true
  );

  INSERT INTO public.byred_users (
    id,
    auth_user_id,
    email,
    name,
    role,
    active
  )
  VALUES (
    v_user_id,
    NEW.id,
    lower(v_email),
    v_name,
    'admin',
    true
  );

  INSERT INTO public.byred_user_tenants (tenant_id, user_id, role)
  VALUES (v_tenant_id, v_user_id, 'admin');

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'byred_bootstrap failed for %: % (SQLSTATE %)', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Single trigger: drop if re-running
DROP TRIGGER IF EXISTS byred_on_auth_user_created ON auth.users;

CREATE TRIGGER byred_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.byred_bootstrap_user_from_auth();
