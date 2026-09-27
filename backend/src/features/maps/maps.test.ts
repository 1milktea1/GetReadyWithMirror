import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { decodePolyline, mapGoogleRoute } from './googleDirectionsAdapter.ts';
import { handleMapsRequest } from './mapsHttp.ts';
import { getCommute } from './mapsService.ts';
import { subwayLineColor } from './subwayLineColor.ts';
import { mapTransitRoute, transitAccessPoint } from './transitAdapter.ts';
import { mapValhallaRoute } from './valhallaAdapter.ts';

test('the demo fixture returns a labeled transit duration for Columbia → Soothr', async () => {
  const result = await getCommute({ now: new Date('2026-09-26T16:00:00.000Z') });
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

test('address punctuation and case still match the fixture', async () => {
  const result = await getCommute({ destinationAddress: '204 e 13th st, new york, ny 10003' });
  assert.equal(result.ok, true);
});

test('an address the fixture does not cover is no-data, not a guessed duration', async () => {
  const result = await getCommute({ destinationAddress: '1 Infinite Loop, Cupertino, CA' });
  assert.deepEqual(result.ok ? null : result.error.status, 'no-data');
});

test('Equinox is a known demo venue so live subway can route there without Google', async () => {
  const previous = process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.GOOGLE_MAPS_API_KEY;
  try {
    const result = await getCommute({
      destinationAddress: '203 E 92nd St, New York, NY 10128',
      destinationName: 'Equinox East 92nd Street',
      live: true,
      fetchFn: async (input) => {
        const url = new URL(String(input));
        if (url.hostname === 'api.transitous.org') {
          assert.match(url.searchParams.get('toPlace') ?? '', /^40\.782/);
          return Response.json({
            itineraries: [
              {
                duration: 20 * 60,
                legs: [{ mode: 'SUBWAY', routeShortName: '1', legGeometry: { points: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' } }],
              },
            ],
          });
        }
        return Response.json({
          trip: { status: 0, summary: { time: 12 * 60 }, legs: [{ shape: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' }] },
        });
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.data.destination.name, 'Equinox East 92nd Street');
    assert.equal(result.data.routes.find((route) => route.mode === 'transit')?.legs?.[0]?.color, '#EE352E');
  } finally {
    restoreKey(previous);
  }
});

test('maps HTTP rejects a bad clock and follows the next addressed event', async () => {
  assert.equal((await handleMapsRequest(new URLSearchParams('now=bogus'))).status, 400);
  const lunch = await handleMapsRequest(new URLSearchParams('now=2026-09-26T13:00:00-04:00'));
  assert.equal(lunch.status, 200);
  assert.equal(lunch.body.ok, true);
  if (!lunch.body.ok) return;
  assert.equal(lunch.body.data.destination.name, 'Lunch · Barney Greengrass');
  assert.equal(lunch.body.data.destination.location.latitude, 40.7869);

  const dinner = await handleMapsRequest(new URLSearchParams('now=2026-09-26T16:00:00-04:00'));
  assert.equal(dinner.status, 200);
  assert.equal(dinner.body.ok, true);
  if (!dinner.body.ok) return;
  assert.equal(dinner.body.data.destination.name, 'Dinner reservation · Soothr');

  const late = await handleMapsRequest(new URLSearchParams('now=2026-09-26T21:00:00-04:00'));
  assert.equal(late.status, 200);
  assert.equal(late.body.ok, true);
  if (!late.body.ok) return;
  assert.equal(late.body.data.destination.name, 'Late dinner · Soothr');
  assert.notEqual(late.body.data.destination.name, dinner.body.ok ? dinner.body.data.destination.name : '');

  const gym = await handleMapsRequest(new URLSearchParams('now=2026-09-27T08:00:00-04:00'));
  assert.equal(gym.body.ok, true);
  if (!gym.body.ok) return;
  assert.equal(gym.body.data.destination.name, 'Gym · Equinox East 92nd Street');
  assert.equal(gym.body.data.destination.location.latitude, 40.7824);
});

test('a known next-event venue still pins when live maps is off', async () => {
  const result = await getCommute({
    destinationAddress: '203 E 92nd St, New York, NY 10128',
    destinationName: 'Gym · Equinox East 92nd Street',
    live: false,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.destination.name, 'Gym · Equinox East 92nd Street');
  assert.equal(result.data.destination.location.latitude, 40.7824);
});

test('subway line colors follow MTA trunks: 1 is red and L is gray', () => {
  assert.equal(subwayLineColor('1'), '#EE352E');
  assert.equal(subwayLineColor('L'), '#A7A9AC');
  assert.equal(subwayLineColor('1', 'ee352e'), '#EE352E');
});

test('planner scenario assumptions use this fixture\'s transit duration', async () => {
  const path = fileURLToPath(new URL('../../../../fixtures/planner/demo-scenarios.json', import.meta.url));
  const scenarios = JSON.parse(readFileSync(path, 'utf8')) as { assumptions: { travelMinutes: number } };
  const commute = await getCommute();
  assert.equal(commute.ok, true);
  if (!commute.ok) return;
  const transit = commute.data.routes.find((route) => route.mode === 'transit');
  assert.equal(transit?.durationMinutes, scenarios.assumptions.travelMinutes);
});

test('offline demo still offers subway, walk, drive, and rideshare', async () => {
  const result = await getCommute({ live: false });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(
    result.data.routes.map((route) => route.mode).sort(),
    ['cycling', 'driving', 'rideshare', 'transit', 'walking'],
  );
  const rideshare = result.data.routes.find((route) => route.mode === 'rideshare');
  const driving = result.data.routes.find((route) => route.mode === 'driving');
  assert.equal(rideshare?.durationMinutes, driving?.durationMinutes);
  assert.equal(rideshare?.provenance.isFixture, true);
  assert.equal(result.data.origin.location.latitude, 40.8075);
  assert.equal(result.data.destination.location.latitude, 40.732269);
});

test('decodes a Google overview polyline', () => {
  const path = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
  assert.equal(path.length, 3);
  assert.ok(Math.abs(path[0]!.latitude - 38.5) < 1e-6);
  assert.ok(Math.abs(path[0]!.longitude - -120.2) < 1e-6);
  assert.ok(Math.abs(path[1]!.latitude - 40.7) < 1e-6);
  assert.ok(Math.abs(path[1]!.longitude - -120.95) < 1e-6);
  assert.ok(Math.abs(path[2]!.latitude - 43.252) < 1e-6);
  assert.ok(Math.abs(path[2]!.longitude - -126.453) < 1e-6);
});

test('maps a Google directions body onto a live route', () => {
  const route = mapGoogleRoute(
    {
      status: 'OK',
      routes: [
        {
          overview_polyline: { points: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' },
          warnings: ['Trip may take longer'],
          legs: [
            {
              duration: { value: 22 * 60 },
              steps: [
                {
                  travel_mode: 'WALKING',
                  polyline: { points: '_p~iF~ps|U_ulLnnqC' },
                },
                {
                  travel_mode: 'TRANSIT',
                  polyline: { points: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' },
                  transit_details: { line: { short_name: '1', color: '#EE352E', vehicle: { type: 'SUBWAY' } } },
                },
                {
                  travel_mode: 'TRANSIT',
                  polyline: { points: '_p~iF~ps|U_ulLnnqC' },
                  transit_details: { line: { short_name: 'L', vehicle: { type: 'SUBWAY' } } },
                },
              ],
            },
          ],
        },
      ],
    },
    'transit',
  );
  assert.equal(route?.durationMinutes, 22);
  assert.equal(route?.provenance.source, 'google');
  assert.equal(route?.provenance.isFixture, false);
  assert.equal(route?.summary, 'Subway 1 · L');
  assert.ok(route && route.path.length >= 3);
  assert.deepEqual(route?.disruptions, ['Trip may take longer']);
  assert.equal(route?.legs?.[1]?.color, '#EE352E');
  assert.equal(route?.legs?.[2]?.color, '#A7A9AC');
  assert.equal(mapGoogleRoute({ status: 'ZERO_RESULTS', routes: [] }, 'transit'), undefined);
});

test('maps a Valhalla trip and decodes its polyline at precision 6', () => {
  const route = mapValhallaRoute(
    {
      trip: {
        status: 0,
        summary: { time: 112.2 * 60 },
        legs: [{ shape: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' }],
      },
    },
    'walking',
  );
  assert.equal(route?.durationMinutes, 112);
  assert.equal(route?.provenance.source, 'valhalla');
  assert.equal(route?.provenance.isFixture, false);
  assert.ok(route && Math.abs(route.path[0]!.latitude - 3.85) < 1e-6);
  assert.ok(route && Math.abs(route.path[0]!.longitude - -12.02) < 1e-6);
  assert.equal(mapValhallaRoute({ trip: { status: 442, summary: { time: 60 } } }, 'walking'), undefined);
});

test('a live Google response replaces the fixture duration', async () => {
  const previous = process.env.GOOGLE_MAPS_API_KEY;
  process.env.GOOGLE_MAPS_API_KEY = 'test-key';
  try {
    const result = await getCommute({
      live: true,
      fetchFn: async (input) => {
        const mode = new URL(String(input)).searchParams.get('mode');
        const minutes = mode === 'transit' ? 22 : mode === 'walking' ? 48 : mode === 'bicycling' ? 16 : 18;
        return Response.json({
          status: 'OK',
          routes: [
            {
              overview_polyline: { points: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' },
              warnings: [],
              legs: [{ duration: { value: minutes * 60 } }],
            },
          ],
        });
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const transit = result.data.routes.find((route) => route.mode === 'transit');
    const rideshare = result.data.routes.find((route) => route.mode === 'rideshare');
    assert.equal(transit?.durationMinutes, 22);
    assert.equal(transit?.provenance.source, 'google');
    assert.equal(rideshare?.durationMinutes, 18);
    assert.equal(rideshare?.summary, 'Rideshare follows the driving route');
    assert.equal(rideshare?.provenance.isFixture, false);
    assert.equal(result.data.provenance.source, 'google');
  } finally {
    restoreKey(previous);
  }
});

test('Columbia campus transit starts at the 116 St 1 train, not a 21-minute walk to the 2/3', () => {
  const station = transitAccessPoint({ latitude: 40.8075, longitude: -73.9626 });
  assert.equal(station.latitude, 40.807722);
  assert.equal(station.longitude, -73.964105);
  const elsewhere = transitAccessPoint({ latitude: 40.732269, longitude: -73.987352 });
  assert.equal(elsewhere.latitude, 40.732269);
});

test('maps a subway itinerary onto a path instead of a straight pin line', () => {
  const route = mapTransitRoute({
    itineraries: [
      {
        duration: 54 * 60,
        legs: [
          { mode: 'WALK', legGeometry: { points: '_p~iF~ps|U_ulLnnqC' } },
          { mode: 'SUBWAY', routeShortName: '1', legGeometry: { points: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' } },
          { mode: 'SUBWAY', routeShortName: 'L', legGeometry: { points: '_p~iF~ps|U_ulLnnqC' } },
        ],
      },
    ],
  });
  assert.equal(route?.mode, 'transit');
  assert.equal(route?.durationMinutes, 54);
  assert.equal(route?.summary, 'Subway 1 · L');
  assert.equal(route?.provenance.source, 'transitous');
  assert.ok(route && route.path.length >= 3);
  assert.deepEqual(
    route?.legs?.map((leg) => ({ kind: leg.kind, line: leg.line, color: leg.color })),
    [
      { kind: 'walk', line: undefined, color: '#FFFFFF' },
      { kind: 'subway', line: '1', color: '#EE352E' },
      { kind: 'subway', line: 'L', color: '#A7A9AC' },
    ],
  );
  assert.ok(route && Math.abs(route.path[0]!.latitude - 3.85) < 1e-4);
  assert.equal(mapTransitRoute({ itineraries: [{ duration: 60, legs: [{ mode: 'BUS', routeShortName: 'M4' }] }] }), undefined);
});

test('an empty transfer walk still connects using the stop coordinates', () => {
  const route = mapTransitRoute({
    itineraries: [
      {
        duration: 40 * 60,
        legs: [
          {
            mode: 'SUBWAY',
            routeShortName: '1',
            legGeometry: { points: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' },
            from: { lat: 40.8077, lon: -73.9641 },
            to: { lat: 40.7378, lon: -74.0002 },
          },
          {
            mode: 'WALK',
            legGeometry: { points: '' },
            from: { lat: 40.7378, lon: -74.0002 },
            to: { lat: 40.732269, lon: -73.987352 },
          },
        ],
      },
    ],
  });
  assert.deepEqual(route?.legs?.at(-1), {
    kind: 'walk',
    color: '#FFFFFF',
    path: [
      { latitude: 40.7378, longitude: -74.0002 },
      { latitude: 40.732269, longitude: -73.987352 },
    ],
  });
});

test('without a Google key, subway comes from Transitous and roads from Valhalla', async () => {
  const previous = process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.GOOGLE_MAPS_API_KEY;
  try {
    const result = await getCommute({
      live: true,
      fetchFn: async (input) => {
        const url = new URL(String(input));
        if (url.hostname === 'api.transitous.org') {
          assert.equal(url.searchParams.get('transitModes'), 'TRANSIT');
          assert.equal(url.searchParams.get('fromPlace'), '40.807722,-73.964105');
          return Response.json({
            itineraries: [
              {
                duration: 54 * 60,
                legs: [
                  { mode: 'WALK', legGeometry: { points: '_p~iF~ps|U_ulLnnqC' } },
                  { mode: 'SUBWAY', routeShortName: '1', legGeometry: { points: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' } },
                ],
              },
            ],
          });
        }
        assert.equal(url.hostname, 'valhalla1.openstreetmap.de');
        const costing = (JSON.parse(url.searchParams.get('json') ?? '{}') as { costing?: string }).costing;
        const minutes = costing === 'pedestrian' ? 112 : costing === 'bicycle' ? 43 : 19;
        return Response.json({
          trip: {
            status: 0,
            summary: { time: minutes * 60 },
            legs: [{ shape: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' }],
          },
        });
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const transit = result.data.routes.find((route) => route.mode === 'transit');
    const walking = result.data.routes.find((route) => route.mode === 'walking');
    const driving = result.data.routes.find((route) => route.mode === 'driving');
    const rideshare = result.data.routes.find((route) => route.mode === 'rideshare');
    assert.equal(transit?.durationMinutes, 54);
    assert.equal(transit?.provenance.source, 'transitous');
    assert.equal(transit?.provenance.isFixture, false);
    assert.ok(transit && transit.path.length >= 3);
    assert.equal(walking?.durationMinutes, 112);
    assert.equal(walking?.provenance.source, 'valhalla');
    assert.equal(driving?.durationMinutes, 19);
    assert.equal(rideshare?.durationMinutes, 19);
    assert.equal(rideshare?.summary, 'Rideshare follows the driving route');
  } finally {
    restoreKey(previous);
  }
});

test('a failed live lookup keeps the labeled fixture for the demo pair', async () => {
  const previous = process.env.GOOGLE_MAPS_API_KEY;
  process.env.GOOGLE_MAPS_API_KEY = 'test-key';
  try {
    const result = await getCommute({
      live: true,
      fetchFn: async (input) => {
        const url = String(input);
        if (url.includes('googleapis')) return Response.json({ status: 'REQUEST_DENIED', routes: [] });
        return Response.json({ error: 'no route' });
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const transit = result.data.routes.find((route) => route.mode === 'transit');
    assert.equal(transit?.durationMinutes, 35);
    assert.equal(transit?.provenance.isFixture, true);
  } finally {
    restoreKey(previous);
  }
});

function restoreKey(previous: string | undefined): void {
  if (previous === undefined) delete process.env.GOOGLE_MAPS_API_KEY;
  else process.env.GOOGLE_MAPS_API_KEY = previous;
}
