"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-5 px-6 py-16 text-center bg-[#f7f6f4]">
      <div className="rounded-full bg-zinc-100 p-4 border border-zinc-200">
        <AlertTriangle
          className="h-10 w-10 text-byred-red"
          strokeWidth={1.75}
          aria-hidden
        />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="font-condensed text-xl font-bold text-zinc-800 tracking-tight">
          Something went wrong
        </h1>
        <p className="text-sm text-zinc-600 leading-relaxed">
          {error.message ||
            "An unexpected error occurred. You can retry or return home."}
        </p>
        {error.digest ? (
          <p className="font-mono text-[10px] text-zinc-400">
            Ref: {error.digest}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button
          type="button"
          className="bg-byred-red hover:bg-byred-red-hot text-white"
          onClick={() => reset()}
        >
          Try again
        </Button>
        <Button type="button" variant="outline" className="border-zinc-300" asChild>
          <Link href="/">Command Center</Link>
        </Button>
      </div>
    </div>
  )
}
