/**
 * Calendar contract (draft).
 *
 * Shapes are JSON-serializable so the same result can be produced by the
 * frontend fixture source today and returned by the backend `/api/calendar`
 * endpoint once Google Calendar is connected. Provider response shapes stay
 * inside the backend calendar adapter and never appear here.
 */

/** Where the data came from. Fixtures must be visibly labeled in the UI. */
export type CalendarProvenance = 'live' | 'fixture'

export type CalendarStatus =
  | 'ok'
  | 'no-data'
  | 'not-authorized'
  | 'not-configured'
  | 'external-provider-unavailable'

export interface CalendarEvent {
  id: string
  title: string
  /** ISO 8601 instant, for example `2026-09-26T21:00:00.000Z`. */
  start: string
  /** ISO 8601 instant. */
  end: string
  venueName?: string
  venueAddress?: string
}

export interface CalendarResult {
  status: CalendarStatus
  provenance: CalendarProvenance
  /** IANA zone the events should be displayed in, for example `America/New_York`. */
  timeZone: string
  /** ISO 8601 instant at which the events were produced or fetched. */
  retrievedAt: string
  /** Empty unless `status` is `ok`. */
  events: CalendarEvent[]
}
