import { redirect } from "next/navigation"
interface Props { params: Promise<{ id: string }> }
export default async function LeadDetailRedirect({ params }: Props) {
  const { id } = await params
  redirect(`/os/crm`)
}
