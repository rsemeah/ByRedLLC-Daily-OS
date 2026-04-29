-- Phase 0: os_task_dependencies junction table
CREATE TABLE IF NOT EXISTS os_task_dependencies (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id            uuid NOT NULL REFERENCES byred_tasks(id) ON DELETE CASCADE,
  depends_on_task_id uuid NOT NULL REFERENCES byred_tasks(id) ON DELETE CASCADE,
  tenant_id          uuid NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, depends_on_task_id),
  CHECK (task_id != depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS idx_os_task_deps_task       ON os_task_dependencies (task_id);
CREATE INDEX IF NOT EXISTS idx_os_task_deps_depends_on ON os_task_dependencies (depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_os_task_deps_tenant     ON os_task_dependencies (tenant_id);

-- RLS
ALTER TABLE os_task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members can read dependencies"
  ON os_task_dependencies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM byred_user_tenants ut
        JOIN byred_users u ON u.id = ut.user_id
       WHERE u.auth_user_id = auth.uid()
         AND ut.tenant_id = os_task_dependencies.tenant_id
    )
  );

CREATE POLICY "tenant members can manage dependencies"
  ON os_task_dependencies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM byred_user_tenants ut
        JOIN byred_users u ON u.id = ut.user_id
       WHERE u.auth_user_id = auth.uid()
         AND ut.tenant_id = os_task_dependencies.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM byred_user_tenants ut
        JOIN byred_users u ON u.id = ut.user_id
       WHERE u.auth_user_id = auth.uid()
         AND ut.tenant_id = os_task_dependencies.tenant_id
    )
  );
