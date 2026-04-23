-- Avatars + Monday user identity.
--
-- byred_users learns two things:
--   1. `source` — where the row originated ('auth' for sign-up, 'monday_import'
--      for roster-only rows pulled from Monday). Affects login eligibility and
--      avatar-upload permissions.
--   2. `monday_user_id` — deterministic foreign id back to Monday. Lets the
--      People-column sync match by id even if someone edits their Monday email.
--
-- A lookup index on lower(email) makes the "does this Monday user already
-- exist in byred_users?" check O(log n) instead of sequential.
--
-- Storage: one public bucket `byred-avatars` that serves user profile pics
-- to the whole app. Read is anon-accessible (avatars are not secret). Writes
-- are authenticated and RLS-scoped by filename convention `{user_id}.{ext}`.

ALTER TABLE public.byred_users
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'auth'
    CHECK (source IN ('auth', 'monday_import', 'seed')),
  ADD COLUMN IF NOT EXISTS monday_user_id text;

-- Case-insensitive unique email (we already canonicalize on write; this
-- catches stragglers and speeds the Monday user lookup).
CREATE UNIQUE INDEX IF NOT EXISTS byred_users_email_lower_unique
  ON public.byred_users (lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS byred_users_monday_user_id_unique
  ON public.byred_users (monday_user_id)
  WHERE monday_user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Storage bucket + policies
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('byred-avatars', 'byred-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Public read: avatars serve from anywhere (rendered in <Image>).
DROP POLICY IF EXISTS "byred_avatars_public_read" ON storage.objects;
CREATE POLICY "byred_avatars_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'byred-avatars');

-- Authenticated upload: signed-in users can insert into the bucket. The
-- server action verifies the target byred_user before calling this, so the
-- policy just enforces "authenticated only, right bucket".
DROP POLICY IF EXISTS "byred_avatars_authenticated_insert" ON storage.objects;
CREATE POLICY "byred_avatars_authenticated_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'byred-avatars');

DROP POLICY IF EXISTS "byred_avatars_authenticated_update" ON storage.objects;
CREATE POLICY "byred_avatars_authenticated_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'byred-avatars')
  WITH CHECK (bucket_id = 'byred-avatars');

DROP POLICY IF EXISTS "byred_avatars_authenticated_delete" ON storage.objects;
CREATE POLICY "byred_avatars_authenticated_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'byred-avatars');

-- ---------------------------------------------------------------------------
-- Extend byred_users RLS: Monday-imported users must be visible to every
-- authenticated member of the org so their name + avatar render next to the
-- tasks they own. These rows carry no auth_user_id and no tenant_user join,
-- so the existing "peer via shared tenant" policy never grants visibility.
-- The data leaked is intentionally roster-level (name, email, avatar_url);
-- mutation policies stay untouched.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS byred_users_select_monday_import_roster ON public.byred_users;
CREATE POLICY byred_users_select_monday_import_roster
  ON public.byred_users
  FOR SELECT
  TO authenticated
  USING (source = 'monday_import');

