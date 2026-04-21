"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("App route error:", error)
  }, [error])

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 className="font-condensed text-xl font-semibold text-zinc-900">
        Something went wrong
      </h1>
      <p className="text-sm text-zinc-600">
        This page could not be loaded. You can try again, or go back from your
        browser.
      </p>
      <Button
        type="button"
        onClick={reset}
        className="bg-byred-red hover:bg-byred-red-hot text-white"
      >
        Try again
      </Button>
    </div>
  )
}
