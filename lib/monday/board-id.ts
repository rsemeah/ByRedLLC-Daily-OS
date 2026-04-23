import "server-only"

/** Default board when `MONDAY_BOARD_ID` is unset (production board for By Red OS). */
export const DEFAULT_MONDAY_BOARD_ID = "18408502764"

export function mondayBoardId(): string {
  const fromEnv = process.env.MONDAY_BOARD_ID?.trim()
  return fromEnv || DEFAULT_MONDAY_BOARD_ID
}
