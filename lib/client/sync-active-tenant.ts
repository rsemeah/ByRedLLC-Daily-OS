/**
 * RLS policies for INSERT on leads/tasks/activities require either no JWT active
 * tenant or a match with `tenant_id`. Call this before server mutations when the
 * user may have switched workspace only in a form (not via the sidebar).
 */
export async function syncActiveTenantForMutation(
  setActiveTenantId: (tenantId: string) => Promise<void>,
  activeTenantId: string | null,
  tenantId: string
): Promise<void> {
  if (activeTenantId !== tenantId) {
    await setActiveTenantId(tenantId)
  }
}
