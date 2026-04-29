import { createClient } from '@/lib/supabase/server'
import { requireTenantScope } from '@/lib/data/tenant-scope'

export default async function OsSettingsPage() {
  const supabase = await createClient()
  const { tenantIds } = await requireTenantScope()

  const { data: user } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('byred_users')
    .select('*')
    .eq('auth_user_id', user.user?.id ?? '')
    .maybeSingle()

  const { data: tenants } = tenantIds.length
    ? await supabase
        .from('byred_tenants')
        .select('id,name,type,color,active')
        .in('id', tenantIds)
    : { data: [] }

  return (
    <div style={{ padding: '28px 28px 48px', maxWidth: 720 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FAFAFA', letterSpacing: '-0.4px', marginBottom: 3 }}>
          Settings
        </h1>
        <p style={{ fontSize: 11, color: '#52525B' }}>Account and workspace preferences</p>
      </div>

      {/* Profile */}
      <Section title="Profile">
        <Row label="Name" value={profile?.name ?? '—'} />
        <Row label="Email" value={user.user?.email ?? '—'} />
        <Row label="Role" value={profile?.role ?? '—'} />
      </Section>

      {/* Workspaces */}
      <Section title="Workspaces">
        {(tenants ?? []).length === 0 ? (
          <p style={{ fontSize: 12, color: '#52525B' }}>No workspaces.</p>
        ) : (
          (tenants ?? []).map((t) => (
            <div
              key={t.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: t.color ?? '#D7261E',
                  flexShrink: 0,
                }}
              />
              <p style={{ fontSize: 12, color: '#FAFAFA', flex: 1 }}>{t.name}</p>
              <span style={{ fontSize: 10, color: '#52525B', textTransform: 'capitalize' }}>
                {t.type}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: t.active ? '#22C55E' : '#52525B',
                  background: t.active ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                  padding: '2px 6px',
                  borderRadius: 3,
                }}
              >
                {t.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))
        )}
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <Row label="Blocker alerts" value="Enabled" />
        <Row label="Daily brief" value="9:00 AM PT" />
        <Row label="Task overdue" value="Enabled" />
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#52525B', textTransform: 'uppercase', marginBottom: 12 }}>
        {title}
      </p>
      <div
        style={{
          background: '#18181B',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 8,
          padding: '4px 16px',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <p style={{ fontSize: 12, color: '#71717A' }}>{label}</p>
      <p style={{ fontSize: 12, color: '#FAFAFA', fontWeight: 500 }}>{value}</p>
    </div>
  )
}
