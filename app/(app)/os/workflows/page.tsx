import { GitBranch } from "lucide-react"
import { OSPlaceholderPage } from "@/components/byred/os/os-placeholder"

export default function OSWorkflowsPage() {
  return (
    <OSPlaceholderPage
      icon={GitBranch}
      title="Workflows"
      description="Build and manage automated workflows across your projects and team. Visual flow builder coming soon."
      eta="soon"
    />
  )
}
