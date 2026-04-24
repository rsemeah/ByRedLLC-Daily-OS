function Bone({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-200/70 ${className ?? ""}`}
    />
  )
}

export default function TenantsLoading() {
  return (
    <div className="space-y-4 px-6 py-6">
      <div>
        <Bone className="h-7 w-32" />
        <Bone className="mt-2 h-3 w-44" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3"
          >
            <div className="flex items-center gap-3">
              <Bone className="h-8 w-8 rounded-full" />
              <Bone className="h-5 w-32" />
            </div>
            <Bone className="h-3 w-full" />
            <Bone className="h-3 w-2/3" />
            <div className="flex gap-2 pt-1">
              <Bone className="h-5 w-16 rounded-full" />
              <Bone className="h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
