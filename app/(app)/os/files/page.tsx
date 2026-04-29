import { FolderOpen } from "lucide-react"
import { OSPlaceholderPage } from "@/components/byred/os/os-placeholder"

export default function OSFilesPage() {
  return (
    <OSPlaceholderPage
      icon={FolderOpen}
      title="Files"
      description="Centralized file storage for all projects, tasks, and clients. Linked to Vercel Blob."
      eta="soon"
    />
  )
}
