-- Fix Monday board bindings.
-- The prior migration (20260423120000_byred_tenants_monday_boards) seeded
-- phantom board IDs (the 18409055xxx series) that do not exist in the
-- workspace tied to MONDAY_API_KEY. As a result 7 of 8 tenant boards were
-- orphans, the pull sync wrote zero items into them, and the UI surfaced
-- only the legacy single-tenant pool.
--
-- This migration rebinds each tenant to the real Monday board id visible
-- to the current token, matched by tenant name. Idempotent.

UPDATE public.byred_tenants
SET monday_board_id = '18408502764'
WHERE lower(name) LIKE '%officespace%';

UPDATE public.byred_tenants
SET monday_board_id = '18408502755'
WHERE lower(name) LIKE '%hirewire%';

UPDATE public.byred_tenants
SET monday_board_id = '18408502757'
WHERE lower(name) LIKE '%authentic hadith%';

UPDATE public.byred_tenants
SET monday_board_id = '18408502761'
WHERE lower(name) LIKE '%redlantern studios — daily%'
   OR lower(name) LIKE '%redlantern studios - daily%';

UPDATE public.byred_tenants
SET monday_board_id = '18408502767'
WHERE lower(name) LIKE '%clarity by redlantern%';

UPDATE public.byred_tenants
SET monday_board_id = '18408919540'
WHERE lower(name) LIKE '%beauty by red%';

UPDATE public.byred_tenants
SET monday_board_id = '18409054873'
WHERE lower(name) LIKE '%paradise property%';

-- Team Pulse has no exact-name board; closest semantic match is the Agile
-- Sprint Planning board in the RedLantern workspace.
UPDATE public.byred_tenants
SET monday_board_id = '18408920377'
WHERE lower(name) LIKE '%team pulse%';
