import { ComingSoon } from '@/components/os/ComingSoon'
import { FileText } from 'lucide-react'

export default function OsDocsPage() {
  return (
    <ComingSoon
      title="Docs"
      description="Write, share, and collaborate on documents, SOPs, and playbooks."
      icon={<FileText size={48} strokeWidth={1} />}
    />
  )
}
