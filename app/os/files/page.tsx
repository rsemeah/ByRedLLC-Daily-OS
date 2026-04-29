import { ComingSoon } from '@/components/os/ComingSoon'
import { Files } from 'lucide-react'

export default function OsFilesPage() {
  return (
    <ComingSoon
      title="Files"
      description="Centralized file storage for your team — assets, deliverables, and attachments."
      icon={<Files size={48} strokeWidth={1} />}
    />
  )
}
