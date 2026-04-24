function Bone({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-200/70 ${className ?? ""}`}
    />
  )
}

export default function TodayLoading() {
  return (
    <div className="space-y-6 px-6 py-6">
      <div>
        <Bone className="h-7 w-32" />
        <Bone className="mt-2 h-3 w-44" />
      </div>

      {/* Brief card skeleton */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
        <Bone className="h-4 w-40" />
        <Bone className="h-3 w-full max-w-md" />
        <Bone className="h-3 w-full max-w-sm" />
      </div>

      {/* Task sections */}
      {[1, 2].map((section) => (
        <div key={section}>
          <Bone className="h-3 w-28 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3"
              >
                <Bone className="h-5 w-5 rounded-full" />
                <Bone className="h-4 w-3/5" />
                <div className="ml-auto flex gap-2">
                  <Bone className="h-5 w-14 rounded-full" />
                  <Bone className="h-5 w-10 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
