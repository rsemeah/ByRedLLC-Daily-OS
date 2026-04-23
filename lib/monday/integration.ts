import "server-only"

/** True when server env has a Monday GraphQL token (push/pull/board list). */
export function mondayApiTokenConfigured(): boolean {
  return Boolean(
    process.env.MONDAY_API_KEY?.trim() || process.env.MONDAY_TOKEN?.trim()
  )
}
