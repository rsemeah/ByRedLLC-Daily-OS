import { BarChart2 } from "lucide-react"
import { OSPlaceholderPage } from "@/components/byred/os/os-placeholder"

export default function OSReportsPage() {
  return (
    <OSPlaceholderPage
      icon={BarChart2}
      title="Reports"
      description="Revenue impact analysis, team velocity, tenant health scores, and custom reporting."
      eta="soon"
    />
  )
}
