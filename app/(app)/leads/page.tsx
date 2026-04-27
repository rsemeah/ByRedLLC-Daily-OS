import { getLeads } from "@/lib/data/leads"
import { LeadsKanban } from "@/components/byred/leads-kanban"

export default async function LeadsPage() {
  const leads = await getLeads()

  return <LeadsKanban initialLeads={leads} />
}
