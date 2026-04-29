import { Bot } from "lucide-react"
import { OSPlaceholderPage } from "@/components/byred/os/os-placeholder"

export default function OSAIPage() {
  return (
    <OSPlaceholderPage
      icon={Bot}
      title="AI"
      description="AI-powered task drafting, brief generation, and intelligent workflow suggestions."
      eta="soon"
    />
  )
}
