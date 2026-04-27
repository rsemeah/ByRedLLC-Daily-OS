import { notFound } from "next/navigation"
import { getLeadById } from "@/lib/data/leads"
import { getActivitiesForObject } from "@/lib/data/activities"
import { LeadDetail } from "@/components/byred/lead-detail"

interface LeadDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params

  const [lead, activities] = await Promise.all([
    getLeadById(id),
    getActivitiesForObject("lead", id),
  ])

  if (!lead) {
    notFound()
  }

  return <LeadDetail lead={lead} activities={activities} />
}
