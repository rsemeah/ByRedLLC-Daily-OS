-- Comprehensive cleanup of legacy permissive RLS policies that bypass
-- tenant isolation. Each table below has a tight set of "member of tenant"
-- and "admin of tenant" policies (added by migrations 20260421140001..7).
-- It also has older permissive policies — created during early Supabase
-- dashboard work, never captured in a migration, never dropped — that
-- short-circuit those checks. Because Postgres applies permissive policies
-- as OR, the tight policies have been a no-op in production.
--
-- Two compounding issues:
--   * `byred_is_admin()` checks byred_users.role = 'admin', and the bootstrap
--     trigger gives every new signup that role. Any policy that grants on
--     `byred_is_admin()` therefore grants on "any authenticated user".
--   * `USING (true)` and `INSERT … WITH CHECK (NULL)` policies grant
--     unconditional access.
--
-- This migration drops every policy that opens cross-tenant access while
-- leaving the tight `byred_*_member` / `byred_*_admin_for_tenant` policies
-- (and the legitimate self/peer policies on `byred_users`) untouched.

-- byred_activities
DROP POLICY IF EXISTS activities_read_all_authenticated ON public.byred_activities;
DROP POLICY IF EXISTS activities_insert_authenticated   ON public.byred_activities;

-- byred_leads
DROP POLICY IF EXISTS leads_read_all_authenticated   ON public.byred_leads;
DROP POLICY IF EXISTS leads_insert_authenticated     ON public.byred_leads;
DROP POLICY IF EXISTS leads_update_authenticated     ON public.byred_leads;
DROP POLICY IF EXISTS leads_delete_admin_or_assigned ON public.byred_leads;

-- byred_tasks
DROP POLICY IF EXISTS tasks_read_all_authenticated ON public.byred_tasks;
DROP POLICY IF EXISTS tasks_insert_authenticated   ON public.byred_tasks;
DROP POLICY IF EXISTS tasks_update_authenticated   ON public.byred_tasks;
DROP POLICY IF EXISTS tasks_delete_admin_or_owner  ON public.byred_tasks;

-- byred_tenants
DROP POLICY IF EXISTS tenants_read_all_authenticated ON public.byred_tenants;
DROP POLICY IF EXISTS tenants_admin_write            ON public.byred_tenants;

-- byred_user_tenants — keeping this table accessible for the app requires
-- the tight `byred_user_tenants_select_member` policy to remain (it does).
DROP POLICY IF EXISTS user_tenants_admin_manage ON public.byred_user_tenants;
DROP POLICY IF EXISTS user_tenants_read_own     ON public.byred_user_tenants;

-- byred_users — leave the proper self/peer policies in place:
--   byred_users_select_self_or_peer, byred_users_update_self_or_admin_peer,
--   byred_users_delete_admin_peer, byred_users_insert_self,
--   byred_users_select_monday_import_roster, users_update_own_profile.
DROP POLICY IF EXISTS users_read_all_authenticated ON public.byred_users;
DROP POLICY IF EXISTS users_admin_manage           ON public.byred_users;
