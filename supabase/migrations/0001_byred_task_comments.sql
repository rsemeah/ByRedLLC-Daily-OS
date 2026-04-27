-- Migration: 0001_byred_task_comments
-- Creates the byred_task_comments table with RLS.

CREATE TABLE IF NOT EXISTS byred_task_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid        NOT NULL REFERENCES byred_tasks(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES byred_users(id) ON DELETE RESTRICT,
  comment    text        NOT NULL CHECK (length(trim(comment)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_byred_task_comments_task_created
  ON byred_task_comments(task_id, created_at ASC);

ALTER TABLE byred_task_comments ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user who can see the parent task can see comments.
-- Keeping this simple: all authenticated users can read comments.
CREATE POLICY "Authenticated users can view task comments"
  ON byred_task_comments FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- INSERT: user_id must match the caller's byred_users row.
CREATE POLICY "Users can add comments as themselves"
  ON byred_task_comments FOR INSERT
  WITH CHECK (
    user_id = (SELECT id FROM byred_users WHERE auth_user_id = auth.uid())
  );

-- DELETE: only the comment author can delete.
CREATE POLICY "Users can delete their own comments"
  ON byred_task_comments FOR DELETE
  USING (
    user_id = (SELECT id FROM byred_users WHERE auth_user_id = auth.uid())
  );
