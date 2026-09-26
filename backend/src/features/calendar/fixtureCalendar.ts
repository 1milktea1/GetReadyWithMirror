// Fixture-backed calendar read. The planner's only view of the demo day until Google
// Calendar exists. Places wall-clock times from fixtures/calendar/demo-day.json onto
// the New York day of `now`, matching the frontend fixture source.

import rawFixture from '../../../../fixtures/calendar/demo-day.json' with { type: 'json' };
import type { CalendarEvent, CalendarResult } from '../../../../shared/contracts/calendar/index.ts';
import { addDays, zonedDate, zonedTimeToUtc } from '../../shared/utils/zonedTime.ts';

interface FixtureEvent {
  id: string;
  title: string;
  dayOffset: number;
  startTime: string;
  durationMinutes: number;
  venueName?: string;
  venueAddress?: string;
}

interface CalendarFixture {
  timeZone: string;
  events: FixtureEvent[];
}

function isFixtureEvent(value: unknown): value is FixtureEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as FixtureEvent;
  return (
    typeof event.id === 'string' &&
    typeof event.title === 'string' &&
    Number.isInteger(event.dayOffset) &&
    typeof event.startTime === 'string' &&
    /^\d{2}:\d{2}$/.test(event.startTime) &&
    Number.isInteger(event.durationMinutes) &&
    event.durationMinutes > 0
  );
}

let cached: CalendarFixture | undefined;

function loadFixture(): CalendarFixture {
  if (cached) return cached;
  const raw: unknown = rawFixture;
  if (!raw || typeof raw !== 'object') throw new Error('Calendar fixture is not an object.');
  const fixture = raw as Partial<CalendarFixture>;
  if (typeof fixture.timeZone !== 'string' || !Array.isArray(fixture.events) || !fixture.events.every(isFixtureEvent)) {
    throw new Error('Calendar fixture is missing a time zone or has a malformed event.');
  }
  cached = { timeZone: fixture.timeZone, events: fixture.events };
  return cached;
}

/** Relative fixture events placed on real instants around `now`. */
export function materializeDemoDay(now: Date): CalendarEvent[] {
  const fixture = loadFixture();
  const today = zonedDate(now, fixture.timeZone);
  return fixture.events.map((event) => {
    const [hour, minute] = event.startTime.split(':').map(Number);
    const start = zonedTimeToUtc({ ...addDays(today, event.dayOffset), hour, minute }, fixture.timeZone);
    const end = new Date(start.getTime() + event.durationMinutes * 60_000);
    return {
      id: event.id,
      title: event.title,
      start: start.toISOString(),
      end: end.toISOString(),
      venueName: event.venueName,
      venueAddress: event.venueAddress,
    };
  });
}

export function getFixtureCalendar(now: Date): CalendarResult {
  const events = materializeDemoDay(now);
  return {
    status: events.length > 0 ? 'ok' : 'no-data',
    provenance: 'fixture',
    timeZone: loadFixture().timeZone,
    retrievedAt: now.toISOString(),
    events,
  };
}

export type TravelEventResult =
  | { ok: true; event: CalendarEvent; timeZone: string; provenance: 'fixture' }
  | { ok: false; error: { status: 'no-data'; message: string } };

/**
 * The soonest event that has not ended and has a street address to travel to.
 * Campus items without an address (lunch, office hours) are not commutes.
 */
export function getNextTravelEvent(now: Date): TravelEventResult {
  const calendar = getFixtureCalendar(now);
  const nowMs = now.getTime();
  const event = calendar.events
    .filter((item) => item.venueAddress && Date.parse(item.end) > nowMs)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0];
  if (!event) {
    return {
      ok: false,
      error: { status: 'no-data', message: 'No upcoming event with an address to travel to.' },
    };
  }
  return { ok: true, event, timeZone: calendar.timeZone, provenance: 'fixture' };
}
