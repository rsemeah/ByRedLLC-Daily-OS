/** Calendar date (YYYY-MM-DD) in America/Los_Angeles — anchors daily briefs to PT business days. */
export function calendarDatePacific(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
  }).format(date)
}
