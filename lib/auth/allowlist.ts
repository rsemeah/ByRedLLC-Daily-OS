/**
 * Internal-member allowlist. Controls who can reach the By Red OS at
 * app.byredllc.com. Hard-coded in env so access can't silently drift from
 * a row toggle in the DB. If you're not on this list, you don't get in —
 * period.
 */

function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw) return new Set()
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  )
}

export function getAllowlist(): Set<string> {
  return parseAllowlist(process.env.BYRED_INTERNAL_EMAILS)
}

export function isInternalMember(email: string | null | undefined): boolean {
  if (!email) return false
  return getAllowlist().has(email.trim().toLowerCase())
}
