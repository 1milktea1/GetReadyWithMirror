import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getNextTravelEvent } from './fixtureCalendar.ts';

test('early afternoon routes to lunch at Barney Greengrass', () => {
  const result = getNextTravelEvent(new Date('2026-09-26T13:00:00-04:00'));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.event.id, 'fixture-office-hours');
  assert.equal(result.event.title, 'Lunch');
  assert.equal(result.event.venueName, 'Barney Greengrass');
  assert.equal(result.event.venueAddress, '541 Amsterdam Ave, New York, NY 10024');
  assert.equal(result.provenance, 'fixture');
});

test('afternoon demo clock selects the Soothr dinner after lunch', () => {
  const result = getNextTravelEvent(new Date('2026-09-26T16:00:00-04:00'));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.event.id, 'fixture-dinner');
  assert.equal(result.event.venueName, 'Soothr');
  assert.equal(result.event.venueAddress, '204 E 13th St, New York, NY 10003');
  assert.equal(result.event.start, '2026-09-26T23:00:00.000Z');
  assert.equal(result.provenance, 'fixture');
});

test('after the 7 PM dinner ends the 12 AM Soothr dinner is next', () => {
  const result = getNextTravelEvent(new Date('2026-09-26T21:00:00-04:00'));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.event.id, 'fixture-dinner-late');
  assert.equal(result.event.venueAddress, '204 E 13th St, New York, NY 10003');
  assert.equal(result.event.start, '2026-09-27T04:00:00.000Z');
});

test('tomorrow morning the Equinox gym is the next addressed event', () => {
  const result = getNextTravelEvent(new Date('2026-09-27T08:00:00-04:00'));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.event.venueName, 'Equinox East 92nd Street');
  assert.equal(result.event.venueAddress, '203 E 92nd St, New York, NY 10128');
  assert.equal(result.event.start, '2026-09-27T14:00:00.000Z');
});
