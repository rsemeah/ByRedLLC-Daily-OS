import { ComingSoon } from '@/components/os/ComingSoon'
import { BarChart3 } from 'lucide-react'

export default function OsReportsPage() {
  return (
    <ComingSoon
      title="Reports"
      description="Velocity, completion rates, revenue impact — business intelligence across all your operations."
      icon={<BarChart3 size={48} strokeWidth={1} />}
    />
  )
}
