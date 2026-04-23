-- Webhook event ledger. Monday may retry the same event; we dedupe by
-- event_id (if Monday sent one) or by a content hash. TTL purge keeps the
-- table small — a cron job or manual GC deletes rows older than 7 days.

CREATE TABLE IF NOT EXISTS public.byred_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('monday')),
  event_key text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  result jsonb,
  UNIQUE (source, event_key)
);

CREATE INDEX IF NOT EXISTS byred_webhook_events_received_at_idx
  ON public.byred_webhook_events (received_at DESC);

ALTER TABLE public.byred_webhook_events ENABLE ROW LEVEL SECURITY;
-- service_role only.
