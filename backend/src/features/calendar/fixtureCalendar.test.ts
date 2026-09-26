import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getNextTravelEvent } from './fixtureCalendar.ts';

test('afternoon demo clock selects the Soothr dinner, not the campus events', () => {
  const result = getNextTravelEvent(new Date('2026-09-26T16:00:00-04:00'));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.event.id, 'fixture-dinner');
  assert.equal(result.event.venueName, 'Soothr');
  assert.equal(result.event.venueAddress, '204 E 13th St, New York, NY 10003');
  assert.equal(result.event.start, '2026-09-26T23:00:00.000Z');
  assert.equal(result.provenance, 'fixture');
});

test('after the dinner has ended there is no address left to travel to', () => {
  const result = getNextTravelEvent(new Date('2026-09-26T21:00:00-04:00'));
  assert.deepEqual(result.ok ? null : result.error.status, 'no-data');
});
