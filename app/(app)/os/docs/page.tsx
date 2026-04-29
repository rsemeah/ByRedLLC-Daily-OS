import { FileText } from "lucide-react"
import { OSPlaceholderPage } from "@/components/byred/os/os-placeholder"

export default function OSDocsPage() {
  return (
    <OSPlaceholderPage
      icon={FileText}
      title="Docs"
      description="Internal knowledge base, SOPs, and project documentation. Searchable and linked to projects."
      eta="soon"
    />
  )
}
