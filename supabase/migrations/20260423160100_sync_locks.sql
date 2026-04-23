-- Cross-process sync lock table.
--
-- We cannot rely on `pg_try_advisory_lock` here: Supabase's pooler resets
-- session state between requests, so session-level advisory locks do not
-- survive across the HTTP calls we use for sync. A lock row with a TTL is
-- universal, inspectable, and safe to steal when expired.

CREATE TABLE IF NOT EXISTS public.byred_sync_locks (
  name text PRIMARY KEY,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  holder text NOT NULL,
  expires_at timestamptz NOT NULL
);

COMMENT ON TABLE public.byred_sync_locks IS
  'Short-lived exclusive locks for cron/sync jobs. Rows with expires_at < now() are dead and safe to replace.';

ALTER TABLE public.byred_sync_locks ENABLE ROW LEVEL SECURITY;

-- No policies: only service_role touches this table, via the functions below.
-- Authenticated clients cannot read or write.

-- Try to acquire `name` for `ttl_seconds`. Returns true if the caller now
-- owns the lock, false if someone else holds a live lock.
CREATE OR REPLACE FUNCTION public.byred_try_sync_lock(
  p_name text,
  p_holder text,
  p_ttl_seconds int
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_expires timestamptz := v_now + make_interval(secs => p_ttl_seconds);
BEGIN
  INSERT INTO public.byred_sync_locks (name, acquired_at, holder, expires_at)
  VALUES (p_name, v_now, p_holder, v_expires)
  ON CONFLICT (name) DO UPDATE
    SET acquired_at = EXCLUDED.acquired_at,
        holder      = EXCLUDED.holder,
        expires_at  = EXCLUDED.expires_at
    WHERE public.byred_sync_locks.expires_at < v_now;

  RETURN FOUND AND (
    SELECT holder = p_holder FROM public.byred_sync_locks WHERE name = p_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.byred_try_sync_lock(text, text, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.byred_try_sync_lock(text, text, int) TO service_role;

CREATE OR REPLACE FUNCTION public.byred_release_sync_lock(
  p_name text,
  p_holder text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.byred_sync_locks
  WHERE name = p_name AND holder = p_holder;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.byred_release_sync_lock(text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.byred_release_sync_lock(text, text) TO service_role;
