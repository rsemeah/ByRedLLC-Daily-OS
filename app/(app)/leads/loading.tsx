function Bone({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-200/70 ${className ?? ""}`}
    />
  )
}

function KanbanColumn() {
  return (
    <div className="flex-1 min-w-[240px] rounded-xl border border-zinc-200 bg-white p-3">
      <Bone className="h-4 w-24 mb-3" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="mb-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3 space-y-2"
        >
          <Bone className="h-4 w-3/4" />
          <Bone className="h-3 w-1/2" />
          <div className="flex gap-2 pt-1">
            <Bone className="h-5 w-16 rounded-full" />
            <Bone className="h-5 w-12 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function LeadsLoading() {
  return (
    <div className="space-y-4 px-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <Bone className="h-7 w-32" />
          <Bone className="mt-2 h-3 w-48" />
        </div>
        <Bone className="h-8 w-28 rounded-full" />
      </div>

      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <KanbanColumn key={i} />
        ))}
      </div>
    </div>
  )
}
