import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getZonedParts, zonedTimeToUtc } from './zonedTime.ts';

const NY = 'America/New_York';

test('New York wall time during daylight time is four hours behind UTC', () => {
  const dinner = zonedTimeToUtc({ year: 2026, month: 9, day: 26, hour: 17, minute: 0 }, NY);
  assert.equal(dinner.toISOString(), '2026-09-26T21:00:00.000Z');
  assert.deepEqual(getZonedParts(dinner, NY), {
    year: 2026,
    month: 9,
    day: 26,
    hour: 17,
    minute: 0,
    second: 0,
  });
});

test('New York wall time during standard time is five hours behind UTC', () => {
  const evening = zonedTimeToUtc({ year: 2026, month: 12, day: 15, hour: 17, minute: 0 }, NY);
  assert.equal(evening.toISOString(), '2026-12-15T22:00:00.000Z');
});
