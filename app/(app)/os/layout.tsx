// OS routes live inside the main app layout which now carries the unified OS sidebar.
// No sub-layout needed — just pass children through.
export default function OSLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
