import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { handleMapsRequest } from './mapsHttp.ts';
import { getCommute } from './mapsService.ts';

test('the demo fixture returns a labeled transit duration for Columbia → Soothr', () => {
  const result = getCommute({ now: new Date('2026-09-26T16:00:00.000Z') });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.provenance.isFixture, true);
  assert.equal(result.data.provenance.source, 'fixture');
  assert.equal(result.data.recommendedMode, 'transit');
  assert.equal(result.data.destination.name, 'Soothr');
  const transit = result.data.routes.find((route) => route.mode === 'transit');
  assert.ok(transit);
  assert.equal(transit.durationMinutes, 35);
  assert.equal(result.data.retrievedAt, '2026-09-26T16:00:00.000Z');
});

test('address punctuation and case still match the fixture', () => {
  const result = getCommute({ destinationAddress: '204 e 13th st, new york, ny 10003' });
  assert.equal(result.ok, true);
});

test('an address the fixture does not cover is no-data, not a guessed duration', () => {
  const result = getCommute({ destinationAddress: '1 Infinite Loop, Cupertino, CA' });
  assert.deepEqual(result.ok ? null : result.error.status, 'no-data');
});

test('maps HTTP rejects a bad clock and serves the fixture by default', () => {
  assert.equal(handleMapsRequest(new URLSearchParams('now=bogus')).status, 400);
  const ok = handleMapsRequest(new URLSearchParams());
  assert.equal(ok.status, 200);
  assert.equal(ok.body.ok, true);
});

test('planner scenario assumptions use this fixture\'s transit duration', () => {
  const path = fileURLToPath(new URL('../../../../fixtures/planner/demo-scenarios.json', import.meta.url));
  const scenarios = JSON.parse(readFileSync(path, 'utf8')) as { assumptions: { travelMinutes: number } };
  const commute = getCommute();
  assert.equal(commute.ok, true);
  if (!commute.ok) return;
  const transit = commute.data.routes.find((route) => route.mode === 'transit');
  assert.equal(transit?.durationMinutes, scenarios.assumptions.travelMinutes);
});
