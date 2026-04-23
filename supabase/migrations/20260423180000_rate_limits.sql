-- DB-backed rate limiter. We avoid in-memory buckets because Next/Vercel
-- functions are stateless: per-function counters would reset on every cold
-- start and lie to us at scale. A single UPDATE/INSERT with row-level
-- concurrency control is exactly what Postgres is good at.
--
-- Contract:
--   byred_rate_limit_try(key, max_events, window_seconds)
--   → { allowed boolean, remaining int, retry_after_s int }
--
-- The caller picks the `key` (e.g. `login:<email>` or `webhook:<ip>`).
-- Buckets are keyed + windowed and garbage-collected lazily on write.

CREATE TABLE IF NOT EXISTS public.byred_rate_limits (
  key text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  events_in_window int NOT NULL DEFAULT 0
);

ALTER TABLE public.byred_rate_limits ENABLE ROW LEVEL SECURITY;
-- service_role only.

CREATE OR REPLACE FUNCTION public.byred_rate_limit_try(
  p_key text,
  p_max_events int,
  p_window_seconds int
)
RETURNS TABLE(allowed boolean, remaining int, retry_after_s int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_events int;
BEGIN
  INSERT INTO public.byred_rate_limits (key, window_started_at, events_in_window)
  VALUES (p_key, v_now, 1)
  ON CONFLICT (key) DO UPDATE
    SET window_started_at = CASE
          WHEN public.byred_rate_limits.window_started_at
               + make_interval(secs => p_window_seconds) <= v_now
          THEN v_now
          ELSE public.byred_rate_limits.window_started_at
        END,
        events_in_window = CASE
          WHEN public.byred_rate_limits.window_started_at
               + make_interval(secs => p_window_seconds) <= v_now
          THEN 1
          ELSE public.byred_rate_limits.events_in_window + 1
        END
    RETURNING window_started_at, events_in_window
    INTO v_window_start, v_events;

  IF v_events <= p_max_events THEN
    allowed := true;
    remaining := greatest(p_max_events - v_events, 0);
    retry_after_s := 0;
    RETURN NEXT;
  ELSE
    allowed := false;
    remaining := 0;
    retry_after_s := greatest(
      extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - v_now))::int,
      1
    );
    RETURN NEXT;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.byred_rate_limit_try(text, int, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.byred_rate_limit_try(text, int, int) TO service_role;
