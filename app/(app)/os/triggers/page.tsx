import { Zap } from "lucide-react"
import { OSPlaceholderPage } from "@/components/byred/os/os-placeholder"

export default function OSTriggersPage() {
  return (
    <OSPlaceholderPage
      icon={Zap}
      title="Triggers"
      description="Set up event-based triggers to fire automations, alerts, and actions across the OS."
      eta="soon"
    />
  )
}
