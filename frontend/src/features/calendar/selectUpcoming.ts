import type { CalendarEvent } from '@contracts/calendar'

export interface UpcomingEvent {
  event: CalendarEvent
  start: Date
  end: Date
  inProgress: boolean
}

/** Events that have not yet ended, soonest first, capped at `limit`. */
export function selectUpcoming(events: CalendarEvent[], now: Date, limit: number): UpcomingEvent[] {
  const nowMs = now.getTime()
  return events
    .map((event) => ({ event, start: new Date(event.start), end: new Date(event.end) }))
    .filter(({ start, end }) => !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()))
    .filter(({ end }) => end.getTime() > nowMs)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, limit)
    .map((item) => ({ ...item, inProgress: item.start.getTime() <= nowMs }))
}
