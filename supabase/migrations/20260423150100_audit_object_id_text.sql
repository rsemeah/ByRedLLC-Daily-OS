-- byred_activities.object_id must accept ids from heterogeneous audited
-- tables. byred_tenants.id is text, byred_tasks.id is uuid, etc.
-- The audit trigger casts NEW.id::text, so the target column must be text
-- or the INSERT explodes with "type uuid but expression is of type text"
-- whenever the audited row has a uuid id. Normalize to text — the trigger
-- stores a string either way.

ALTER TABLE public.byred_activities
  ALTER COLUMN object_id TYPE text USING object_id::text;
