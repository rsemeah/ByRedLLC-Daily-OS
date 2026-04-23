-- Enable upsert-by-Monday-item across webhook + pull sync paths.
-- Partial unique: only enforced when monday_item_id IS NOT NULL, so un-synced
-- tasks can coexist without clashing on a NULL value.
--
-- Safe to re-run: drops existing non-unique index first.

DROP INDEX IF EXISTS public.idx_byred_tasks_monday;

CREATE UNIQUE INDEX IF NOT EXISTS byred_tasks_monday_item_id_unique
  ON public.byred_tasks (monday_item_id)
  WHERE monday_item_id IS NOT NULL;
