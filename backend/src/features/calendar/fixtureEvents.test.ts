import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getUpcomingEvents } from './fixtureEvents.ts';

test('upcoming demo events keep the dinner and label the calendar as a fixture', () => {
  const result = getUpcomingEvents(new Date('2026-09-26T14:00:00-04:00'));
  assert.equal(result.data.provenance, 'fixture');
  assert.match(result.data.label, /not a live/);
  assert.equal(result.data.events[0].title, 'Office hours');
  const dinner = result.data.events.find((event) => event.title === 'Dinner reservation');
  assert.equal(dinner?.venueName, 'Soothr');
  assert.equal(dinner?.venueAddress, '204 E 13th St, New York, NY 10003');
});

test('after the 7 PM dinner ends the 10:30 PM dinner is still upcoming', () => {
  const result = getUpcomingEvents(new Date('2026-09-26T21:00:00-04:00'));
  assert.equal(result.data.events[0].title, 'Late dinner');
  assert.equal(result.data.events[0].start, '2026-09-27T02:30:00.000Z');
  const gym = result.data.events.find((event) => event.title === 'Gym');
  assert.equal(gym?.venueName, 'Equinox East 92nd Street');
});
