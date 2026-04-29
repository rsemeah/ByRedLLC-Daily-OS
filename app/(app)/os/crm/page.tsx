import { Database } from "lucide-react"
import { OSPlaceholderPage } from "@/components/byred/os/os-placeholder"

export default function OSCRMPage() {
  return (
    <OSPlaceholderPage
      icon={Database}
      title="CRM"
      description="Client and contact management. Track relationships, deals, and revenue across all tenants."
      eta="soon"
    />
  )
}
