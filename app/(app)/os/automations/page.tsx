import { Zap } from "lucide-react"
import { OSPlaceholderPage } from "@/components/byred/os/os-placeholder"

export default function OSAutomationsPage() {
  return (
    <OSPlaceholderPage
      icon={Zap}
      title="Automations"
      description="Trigger-based workflows that automatically update tasks, send alerts, and sync data."
      eta="soon"
    />
  )
}
