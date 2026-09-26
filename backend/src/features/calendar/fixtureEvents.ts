// Demo calendar for the assistant until Google Calendar is connected.
// Events are the shared synthetic fixture, placed on today's date in New York.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

interface FixtureEvent {
  id: string;
  title: string;
  dayOffset: number;
  startTime: string;
  durationMinutes: number;
  venueName?: string;
  venueAddress?: string;
}

interface FixtureFile {
  timeZone: string;
  events: FixtureEvent[];
}

export function getUpcomingEvents(now = new Date()) {
  const fixture = JSON.parse(readFileSync(fixturePath(), 'utf8')) as FixtureFile;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: fixture.timeZone }).format(now);
  const events = fixture.events
    .map((event) => {
      const start = wallTime(addDays(today, event.dayOffset), event.startTime, fixture.timeZone, now);
      const end = new Date(start.getTime() + event.durationMinutes * 60_000);
      return {
        id: event.id,
        title: event.title,
        start: start.toISOString(),
        end: end.toISOString(),
        venueName: event.venueName,
        venueAddress: event.venueAddress,
      };
    })
    .filter((event) => Date.parse(event.end) > now.getTime())
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    .slice(0, 6);

  return {
    ok: true as const,
    data: {
      provenance: 'fixture' as const,
      label: 'Synthetic demo calendar, not a live Google Calendar.',
      timeZone: fixture.timeZone,
      events,
    },
  };
}

function fixturePath(): string {
  return fileURLToPath(new URL('../../../../fixtures/calendar/demo-day.json', import.meta.url));
}

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function wallTime(date: string, time: string, timeZone: string, reference: Date): Date {
  const offset = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(reference)
    .find((part) => part.type === 'timeZoneName')!
    .value.replace('GMT', '');
  return new Date(`${date}T${time}:00${offset || 'Z'}`);
}
