-- Tenant-scoped uniqueness on Monday item ids.
--
-- Prior index was global: one Monday item id could only exist for one row
-- across the whole database. That assumption holds only while every client
-- shares one Monday workspace; the moment a second workspace joins, a shared
-- item id silently hijacks another tenant's row.
--
-- Composite `(tenant_id, monday_item_id)` is the correct multi-tenant key:
-- each tenant can independently track its own Monday items, same id can
-- legitimately appear under two tenants, and upsert with onConflict becomes
-- deterministic.

DROP INDEX IF EXISTS public.byred_tasks_monday_item_id_unique;
DROP INDEX IF EXISTS public.idx_byred_tasks_monday;

CREATE UNIQUE INDEX IF NOT EXISTS byred_tasks_tenant_monday_item_unique
  ON public.byred_tasks (tenant_id, monday_item_id)
  WHERE monday_item_id IS NOT NULL;
