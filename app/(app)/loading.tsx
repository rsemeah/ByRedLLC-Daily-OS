export default function AppLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-zinc-500">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-byred-red"
        aria-hidden
      />
      <p className="text-sm">Loading…</p>
    </div>
  )
}
