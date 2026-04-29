import { ComingSoon } from '@/components/os/ComingSoon'
import { MessageSquare } from 'lucide-react'

export default function OsCommsPage() {
  return (
    <ComingSoon
      title="Comms"
      description="Team messaging, threads, and communication hub — all in one place."
      icon={<MessageSquare size={48} strokeWidth={1} />}
    />
  )
}
