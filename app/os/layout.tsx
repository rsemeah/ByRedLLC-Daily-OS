import { TenantProvider } from '@/lib/context/user-context'
import { createClient } from '@/lib/supabase/server'
import { isInternalMember } from '@/lib/auth/allowlist'
import { redirect } from 'next/navigation'
import type { ByredTenant, ByredUser, ByredUserTenant } from '@/types/database'

export default async function OsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) redirect('/login')
  if (!isInternalMember(authUser.email)) redirect('/auth/error?code=not_authorized')

  const { data: profile } = await supabase
    .from('byred_users')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (!profile) redirect('/onboarding')

  const typedProfile = profile as ByredUser

  const { data: userTenants } = await supabase
    .from('byred_user_tenants')
    .select(
      'role,byred_tenants(id,name,type,color,active,monday_board_id,monday_group_id,created_at,updated_at)'
    )
    .eq('user_id', typedProfile.id)

  const typedUserTenants = (userTenants ?? []) as Array<{
    role: ByredUserTenant['role']
    byred_tenants: ByredTenant | ByredTenant[] | null
  }>

  const tenants = typedUserTenants
    .filter((r) => r.byred_tenants)
    .map((r) => {
      const t = Array.isArray(r.byred_tenants) ? r.byred_tenants[0] : r.byred_tenants
      return {
        id: t?.id ?? '',
        name: t?.name ?? '',
        type: t?.type ?? 'service',
        color: t?.color ?? '#D7261E',
        active: t?.active ?? true,
        monday_board_id: t?.monday_board_id ?? null,
        monday_group_id: t?.monday_group_id ?? null,
        created_at: t?.created_at ?? null,
        updated_at: t?.updated_at ?? null,
        role: r.role,
      }
    })

  if (tenants.length === 0) redirect('/onboarding')

  const metadataTenantId =
    typeof authUser.user_metadata?.active_tenant_id === 'string'
      ? authUser.user_metadata.active_tenant_id
      : null

  const initialActiveTenantId =
    metadataTenantId && tenants.some((t) => t.id === metadataTenantId)
      ? metadataTenantId
      : (tenants[0]?.id ?? null)

  const { data: directoryRows } = await supabase
    .from('byred_users')
    .select('id,name,email,avatar_url,role')
    .eq('active', true)

  const directory = (
    (directoryRows ?? []) as Array<{
      id: string
      name: string
      email: string
      avatar_url: string | null
      role: string | null
    }>
  ).map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    avatar_url: r.avatar_url,
    role: r.role,
  }))

  return (
    <TenantProvider
      user={{
        authUser,
        profile: typedProfile,
        tenants,
        initialActiveTenantId,
        directory,
      }}
    >
      <div className="min-h-screen" style={{ background: '#0F0F10', color: '#FAFAFA' }}>
        {children}
      </div>
    </TenantProvider>
  )
}
