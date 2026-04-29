import { MessageSquare } from "lucide-react"
import { OSPlaceholderPage } from "@/components/byred/os/os-placeholder"

export default function OSCommsPage() {
  return (
    <OSPlaceholderPage
      icon={MessageSquare}
      title="Comms"
      description="Team messaging, client updates, and notification center. Unified communication layer."
      eta="soon"
    />
  )
}
