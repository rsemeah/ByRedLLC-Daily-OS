function Bone({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-200/70 ${className ?? ""}`}
    />
  )
}

export default function ActivitiesLoading() {
  return (
    <div className="space-y-4 px-6 py-6">
      <div>
        <Bone className="h-7 w-36" />
        <Bone className="mt-2 h-3 w-44" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3"
          >
            <Bone className="mt-0.5 h-6 w-6 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-3.5 w-3/4" />
              <Bone className="h-3 w-1/3" />
            </div>
            <Bone className="h-3 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
