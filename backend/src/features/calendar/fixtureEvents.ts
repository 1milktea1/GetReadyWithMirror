// Demo calendar for the assistant until Google Calendar is connected.
// Events are the shared synthetic fixture, placed on the current (or next) New York demo day.

import { getFixtureCalendar } from './fixtureCalendar.ts';

export function getUpcomingEvents(now = new Date()) {
  const calendar = getFixtureCalendar(now);
  const events = calendar.events
    .filter((event) => Date.parse(event.end) > now.getTime())
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    .slice(0, 6)
    .map(({ title, start, end, venueName, venueAddress }) => ({
      title,
      start,
      end,
      venueName,
      venueAddress,
    }));

  return {
    ok: true as const,
    data: {
      provenance: 'fixture' as const,
      label: 'Synthetic demo calendar, not a live Google Calendar.',
      timeZone: calendar.timeZone,
      events,
    },
  };
}
