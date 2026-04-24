import {
  format,
  isBefore,
  isToday,
  isValid,
  parseISO,
  differenceInHours,
} from "date-fns"

interface DueDateCellProps {
  dueDate: string | null
  className?: string
}

export function DueDateCell({ dueDate, className }: DueDateCellProps) {
  if (!dueDate) {
    return (
      <span
        className={className}
        style={{ fontSize: 10, color: "#cccccc" }}
      >
        —
      </span>
    )
  }

  const date = parseISO(dueDate)
  if (!isValid(date)) {
    return (
      <span
        className={className}
        style={{ fontSize: 10, color: "#cccccc" }}
      >
        —
      </span>
    )
  }

  const now = new Date()
  const isOverdue = isBefore(date, now) && !isToday(date)
  const within48h =
    !isOverdue && differenceInHours(date, now) <= 48 && differenceInHours(date, now) >= 0

  let color = "#bbbbbb"
  let fontWeight: 400 | 600 | 700 = 400
  if (isOverdue) {
    color = "#D02C2A"
    fontWeight = 700
  } else if (within48h || isToday(date)) {
    color = "#cc7700"
    fontWeight = 600
  }

  return (
    <span
      className={className}
      style={{ fontSize: 10, color, fontWeight }}
    >
      {isToday(date) ? "Today" : format(date, "MMM d")}
    </span>
  )
}
