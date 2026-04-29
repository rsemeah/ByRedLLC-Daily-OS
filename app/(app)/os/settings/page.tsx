import { Settings } from "lucide-react"
import { OSPlaceholderPage } from "@/components/byred/os/os-placeholder"

export default function OSSettingsPage() {
  return (
    <OSPlaceholderPage
      icon={Settings}
      title="OS Settings"
      description="Configure By Red OS preferences, integrations, notification rules, and user permissions."
      eta="soon"
    />
  )
}
