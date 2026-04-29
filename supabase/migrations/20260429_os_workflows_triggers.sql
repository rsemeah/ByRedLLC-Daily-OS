-- Phase 5: os_workflows + os_triggers

CREATE TABLE IF NOT EXISTS os_workflows (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  name          text NOT NULL,
  trigger_event text NOT NULL,
  condition     jsonb,
  action        jsonb NOT NULL,
  is_active     boolean DEFAULT true,
  created_by    uuid,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_os_workflows_tenant ON os_workflows (tenant_id);

ALTER TABLE os_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members can manage workflows"
  ON os_workflows FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM byred_user_tenants ut
        JOIN byred_users u ON u.id = ut.user_id
       WHERE u.auth_user_id = auth.uid()
         AND ut.tenant_id = os_workflows.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM byred_user_tenants ut
        JOIN byred_users u ON u.id = ut.user_id
       WHERE u.auth_user_id = auth.uid()
         AND ut.tenant_id = os_workflows.tenant_id
    )
  );


CREATE TABLE IF NOT EXISTS os_triggers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  name            text NOT NULL,
  watch_entity    text NOT NULL,
  watch_condition jsonb NOT NULL,
  alert_user_ids  uuid[],
  alert_channels  text[],
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_os_triggers_tenant ON os_triggers (tenant_id);

ALTER TABLE os_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members can manage triggers"
  ON os_triggers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM byred_user_tenants ut
        JOIN byred_users u ON u.id = ut.user_id
       WHERE u.auth_user_id = auth.uid()
         AND ut.tenant_id = os_triggers.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM byred_user_tenants ut
        JOIN byred_users u ON u.id = ut.user_id
       WHERE u.auth_user_id = auth.uid()
         AND ut.tenant_id = os_triggers.tenant_id
    )
  );
