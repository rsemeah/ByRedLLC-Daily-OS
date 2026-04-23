-- Dev/staging: fixed tenant set for local seed. Idempotent: skips rows that already
-- use the same name (see WHERE NOT EXISTS).
INSERT INTO public.byred_tenants (id, name, type, color, active)
SELECT gen_random_uuid(), v.name, v.type, v.color, true
FROM (
  VALUES
    ('By Red LLC', 'parent', '#d90009'),
    ('Paradise Property Services', 'service', '#0ea5e9'),
    ('HireWire', 'product', '#22c55e'),
    ('Authentic Hadith', 'product', '#a855f7')
) AS v(name, type, color)
WHERE NOT EXISTS (SELECT 1 FROM public.byred_tenants t WHERE t.name = v.name);

-- Bootstrap: (1) byred_users.id = auth.users.id for identity/RLS clarity.
-- (2) Service/seed user creation can set raw_user_meta_data.byred_skip_bootstrap = "true"
--     to skip auto tenant+profile; scripts/seed-users.ts then provisions rows against
--     explicit tenants only.
CREATE OR REPLACE FUNCTION public.byred_bootstrap_user_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
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

  -- Seed scripts: skip personal workspace; profile/memberships created out-of-band.
  IF btrim(COALESCE(NEW.raw_user_meta_data->>'byred_skip_bootstrap', '')) = 'true' THEN
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
    NEW.id,
    NEW.id,
    lower(v_email),
    v_name,
    'admin',
    true
  );

  INSERT INTO public.byred_user_tenants (tenant_id, user_id, role)
  VALUES (v_tenant_id, NEW.id, 'admin');

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'byred_bootstrap failed for %: % (SQLSTATE %)', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;
