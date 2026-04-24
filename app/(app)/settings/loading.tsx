function Bone({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-200/70 ${className ?? ""}`}
    />
  )
}

export default function SettingsLoading() {
  return (
    <div className="space-y-6 px-6 py-6 max-w-2xl">
      <div>
        <Bone className="h-7 w-32" />
        <Bone className="mt-2 h-3 w-48" />
      </div>

      {/* Settings sections */}
      {[1, 2, 3].map((section) => (
        <div
          key={section}
          className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4"
        >
          <Bone className="h-5 w-40" />
          <div className="space-y-3">
            <div>
              <Bone className="h-3 w-20 mb-1.5" />
              <Bone className="h-9 w-full rounded" />
            </div>
            <div>
              <Bone className="h-3 w-24 mb-1.5" />
              <Bone className="h-9 w-full rounded" />
            </div>
          </div>
          <Bone className="h-9 w-28 rounded" />
        </div>
      ))}
    </div>
  )
}
