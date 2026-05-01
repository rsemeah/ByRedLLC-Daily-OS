import { redirect } from 'next/navigation'

type SearchParams = Promise<{ tenant_id?: string; filter?: string }>

export default async function TasksRedirect({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const qs = new URLSearchParams()
  if (params.tenant_id) qs.set('tenant_id', params.tenant_id)
  if (params.filter) qs.set('filter', params.filter)
  redirect(qs.size > 0 ? `/os/tasks?${qs.toString()}` : '/os/tasks')
}
