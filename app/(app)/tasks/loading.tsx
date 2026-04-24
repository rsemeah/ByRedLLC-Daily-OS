function Bone({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-200/70 ${className ?? ""}`}
    />
  )
}

export default function TasksLoading() {
  return (
    <div className="space-y-4 px-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <Bone className="h-7 w-40" />
          <Bone className="mt-2 h-3 w-56" />
        </div>
        <Bone className="h-8 w-28 rounded-full" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Bone key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      {/* Table header */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-zinc-100 px-4 py-3">
          <Bone className="h-3 w-full max-w-2xl" />
        </div>
        <div className="p-4 space-y-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Bone key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
