import type { CalendarEvent } from '@contracts/calendar'
import demoDay from '@fixtures/calendar/demo-day.json'
import { addDays, zonedDate, zonedTimeToUtc } from '../../../shared/time/zonedTime'
import type { CalendarSource } from './calendarSource'

export interface CalendarFixtureEvent {
  id: string
  title: string
  /** 0 = the current day in the fixture's zone, 1 = tomorrow, ... */
  dayOffset: number
  /** Wall-clock `HH:MM` in the fixture's zone. */
  startTime: string
  durationMinutes: number
  venueName?: string
  venueAddress?: string
}

export interface CalendarFixture {
  timeZone: string
  events: CalendarFixtureEvent[]
}

/** Places relative fixture events onto real instants around `now`, so the sample day never goes stale. */
export function materializeFixture(fixture: CalendarFixture, now: Date): CalendarEvent[] {
  const today = zonedDate(now, fixture.timeZone)
  return fixture.events.map((event) => {
    const [hour, minute] = event.startTime.split(':').map(Number)
    const start = zonedTimeToUtc({ ...addDays(today, event.dayOffset), hour, minute }, fixture.timeZone)
    const end = new Date(start.getTime() + event.durationMinutes * 60_000)
    return {
      id: event.id,
      title: event.title,
      start: start.toISOString(),
      end: end.toISOString(),
      venueName: event.venueName,
      venueAddress: event.venueAddress,
    }
  })
}

export function createFixtureCalendarSource(fixture: CalendarFixture = demoDay): CalendarSource {
  return {
    async fetchEvents(now) {
      const events = materializeFixture(fixture, now)
      return {
        status: events.length > 0 ? 'ok' : 'no-data',
        provenance: 'fixture',
        timeZone: fixture.timeZone,
        retrievedAt: now.toISOString(),
        events,
      }
    },
  }
}
