import type { CalendarResult } from '@contracts/calendar'

/**
 * Where the calendar module gets events from.
 *
 * Implementations: the fixture source today; later an HTTP source calling the
 * backend `/api/calendar`, which owns the Google Calendar adapter and
 * credentials. The frontend never talks to Google directly.
 */
export interface CalendarSource {
  /** Events around `now`, including ones already in progress. */
  fetchEvents(now: Date): Promise<CalendarResult>
}
