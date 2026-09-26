export const RUSH_MARKS = [30, 15, 5] as const
export type RushMark = (typeof RUSH_MARKS)[number]

/** The reminder mark when the event is inside that minute, otherwise null. */
export function rushMark(minutesLeft: number): RushMark | null {
  for (const mark of RUSH_MARKS) {
    if (minutesLeft <= mark && minutesLeft > mark - 1) return mark
  }
  return null
}
