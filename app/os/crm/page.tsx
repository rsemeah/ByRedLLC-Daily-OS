import { ComingSoon } from '@/components/os/ComingSoon'
import { User } from 'lucide-react'

export default function OsCRMPage() {
  return (
    <ComingSoon
      title="CRM"
      description="Manage contacts, companies, deals, and client relationships."
      icon={<User size={48} strokeWidth={1} />}
    />
  )
}
