import { Radio } from "lucide-react"
import { OSPlaceholderPage } from "@/components/byred/os/os-placeholder"

export default function OSSignalsPage() {
  return (
    <OSPlaceholderPage
      icon={Radio}
      title="Signals"
      description="Real-time intelligence feed — monitor key metrics, anomalies, and business signals as they happen."
      eta="soon"
    />
  )
}
