"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"

export function BackButton() {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Go back"
      style={{
        width: 24,
        height: 24,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        color: "#52525B",
        cursor: "pointer",
        borderRadius: 3,
        padding: 0,
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#A1A1AA")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#52525B")}
    >
      <ChevronLeft size={15} strokeWidth={2} />
    </button>
  )
}
