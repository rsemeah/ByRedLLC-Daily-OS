-- Per-tenant Monday board binding.
-- Each tenant in By Red OS now maps to exactly one Monday.com board id.
-- Push, pull, webhook routing all resolve the board from the tenant row
-- instead of the single MONDAY_BOARD_ID env var (kept as legacy fallback).

ALTER TABLE public.byred_tenants
  ADD COLUMN IF NOT EXISTS monday_board_id text,
  ADD COLUMN IF NOT EXISTS monday_group_id text;

-- One board can only belong to one tenant. Partial index allows many NULLs.
CREATE UNIQUE INDEX IF NOT EXISTS byred_tenants_monday_board_id_unique
  ON public.byred_tenants (monday_board_id)
  WHERE monday_board_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Map the 8 canonical boards onto tenants.
-- Strategy: update existing tenants by fuzzy name match; insert the rest.
-- Idempotent — safe to re-run.
-- ---------------------------------------------------------------------------

UPDATE public.byred_tenants
  SET monday_board_id = '18409054873',
      name            = '🧰 Paradise Property Services'
  WHERE monday_board_id IS NULL
    AND lower(name) LIKE '%paradise property%';

UPDATE public.byred_tenants
  SET monday_board_id = '18409054904',
      name            = '🚀 HireWire'
  WHERE monday_board_id IS NULL
    AND lower(name) LIKE '%hirewire%';

UPDATE public.byred_tenants
  SET monday_board_id = '18409055099',
      name            = '📖 Authentic Hadith — App Store Launch'
  WHERE monday_board_id IS NULL
    AND lower(name) LIKE '%authentic hadith%';

INSERT INTO public.byred_tenants (id, name, type, color, active, monday_board_id)
SELECT gen_random_uuid(), v.name, v.type, v.color, true, v.board_id
FROM (VALUES
  ('🏛️ By Red - OfficeSpace',          'parent',  '#d90009', '18409055001'),
  ('🪔 RedLantern Studios — Daily',     'service', '#eab308', '18409055047'),
  ('👸🏻 Beauty By Red - Operations',    'service', '#ec4899', '18409054944'),
  ('🌟 Clarity by RedLantern Studios',  'product', '#eab308', '18409055146'),
  ('🏁 By Red — Team Pulse',            'parent',  '#d90009', '18409055191')
) AS v(name, type, color, board_id)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.byred_tenants t
  WHERE t.monday_board_id = v.board_id
     OR t.name            = v.name
);
