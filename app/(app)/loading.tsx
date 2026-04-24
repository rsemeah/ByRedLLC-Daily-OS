function Bone({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-200/70 ${className ?? ""}`}
    />
  )
}

export default function AppLoading() {
  return (
    <div className="space-y-6 px-6 py-6">
      {/* Hero skeleton */}
      <div className="rounded-[28px] bg-zinc-950 p-8">
        <Bone className="h-4 w-40 !bg-white/10" />
        <Bone className="mt-6 h-16 w-3/4 !bg-white/10" />
        <Bone className="mt-4 h-4 w-1/2 !bg-white/8" />
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/[0.07] p-4"
            >
              <Bone className="h-3 w-20 !bg-white/10" />
              <Bone className="mt-3 h-9 w-12 !bg-white/10" />
            </div>
          ))}
        </div>
      </div>

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-md border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <Bone className="h-9 w-9 rounded-md" />
            <div>
              <Bone className="h-6 w-10" />
              <Bone className="mt-1.5 h-3 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <Bone className="h-2.5 w-24" />
            <Bone className="mt-2 h-4 w-16" />
          </div>
          <Bone className="h-8 w-24 rounded-full" />
        </div>
        <div className="p-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Bone key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
