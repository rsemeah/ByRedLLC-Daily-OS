-- The partial unique INDEX on (tenant_id, monday_item_id) cannot be used as
-- an ON CONFLICT target by PostgREST (postgres requires the predicate in
-- the INSERT, which PostgREST does not synthesize). Swap to a proper UNIQUE
-- CONSTRAINT with no predicate — NULLs are distinct by default, so any
-- number of user-created rows with monday_item_id IS NULL per tenant still
-- coexist without collision.

DROP INDEX IF EXISTS public.byred_tasks_tenant_monday_item_unique;

ALTER TABLE public.byred_tasks
  DROP CONSTRAINT IF EXISTS byred_tasks_tenant_monday_item_unique;

ALTER TABLE public.byred_tasks
  ADD CONSTRAINT byred_tasks_tenant_monday_item_unique
  UNIQUE (tenant_id, monday_item_id);
