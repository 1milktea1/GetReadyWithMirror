// Maps public service. Other features call getCommute(); nothing imports an adapter except this file.
//
// Order: Google Directions when GOOGLE_MAPS_API_KEY is set, then the public Valhalla
// road router for walking / driving / cycling, then the labeled fixture for any mode
// still missing (subway, when there is no key). A pair the fixture does not cover is
// never given a fixture duration.

import { loadMapsFixture, sameAddress, type FixtureRoute } from './fixtureAdapter.ts';
import { fetchGoogleRoute, googleMapsApiKey } from './googleDirectionsAdapter.ts';
import { fetchValhallaRoute } from './valhallaAdapter.ts';
import type {
  LatLng,
  MapPlace,
  MapsResponse,
  RouteAlternative,
  TransportMode,
} from '../../../../shared/contracts/maps/types.ts';

export interface GetCommuteOptions {
  /** When omitted, the fixture origin (Columbia University) is used. */
  originAddress?: string;
  /** When omitted, the fixture destination (Soothr) is used. */
  destinationAddress?: string;
  /** Passed to Google as departure_time when it is not in the past. */
  now?: Date;
  /** Injected in tests. Defaults to global fetch. */
  fetchFn?: typeof fetch;
  /**
   * Query live routers. Defaults to on unless MAPS_LIVE=0, which the test script sets
   * so the suite stays offline.
   */
  live?: boolean;
}

const MODES: readonly TransportMode[] = ['transit', 'driving', 'walking', 'cycling', 'rideshare'];
const LIVE_MODES: readonly TransportMode[] = ['transit', 'walking', 'driving', 'cycling'];

export function isTransportMode(value: string): value is TransportMode {
  return (MODES as readonly string[]).includes(value);
}

const cache = new Map<string, { at: number; value: MapsResponse }>();
const CACHE_MS = 60_000;

export async function getCommute(options: GetCommuteOptions = {}): Promise<MapsResponse> {
  const live = options.live ?? process.env.MAPS_LIVE !== '0';
  const fixture = loadMapsFixture();
  const originAddress = options.originAddress?.trim();
  const destinationAddress = options.destinationAddress?.trim();

  if (originAddress !== undefined && originAddress.length === 0) {
    return { ok: false, error: { status: 'input-invalid', message: 'Origin address is empty.' } };
  }
  if (destinationAddress !== undefined && destinationAddress.length === 0) {
    return { ok: false, error: { status: 'input-invalid', message: 'Destination address is empty.' } };
  }

  const originMatches = !originAddress || sameAddress(originAddress, fixture.origin.address);
  const destinationMatches = !destinationAddress || sameAddress(destinationAddress, fixture.destination.address);
  const demoPair = originMatches && destinationMatches;

  if (!demoPair && !(live && googleMapsApiKey())) {
    return {
      ok: false,
      error: {
        status: 'no-data',
        message: 'No fixture route for that trip, and live maps is not configured.',
      },
    };
  }

  const cacheKey = live && !options.fetchFn ? `${originAddress ?? ''}|${destinationAddress ?? ''}` : undefined;
  if (cacheKey) {
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  }

  const origin = demoPair ? fixture.origin : placeFromAddress(originAddress ?? fixture.origin.address);
  const destination = demoPair ? fixture.destination : placeFromAddress(destinationAddress ?? fixture.destination.address);
  const googleKey = live ? googleMapsApiKey() : undefined;
  const routes = new Map<TransportMode, RouteAlternative>();

  if (googleKey) {
    const googleOrigin = demoPair ? point(origin.location) : origin.address;
    const googleDestination = demoPair ? point(destination.location) : destination.address;
    const fetched = await Promise.all(
      LIVE_MODES.map((mode) =>
        fetchGoogleRoute({
          origin: googleOrigin,
          destination: googleDestination,
          mode,
          departure: options.now,
          apiKey: googleKey,
          fetchFn: options.fetchFn,
        }),
      ),
    );
    for (const route of fetched) {
      if (route) routes.set(route.mode, route);
    }
  }

  if (live && demoPair) {
    const missing = (['walking', 'driving', 'cycling'] as const).filter((mode) => !routes.has(mode));
    const fetched = await Promise.all(
      missing.map((mode) =>
        fetchValhallaRoute({
          origin: origin.location,
          destination: destination.location,
          mode,
          fetchFn: options.fetchFn,
        }),
      ),
    );
    for (const route of fetched) {
      if (route) routes.set(route.mode, route);
    }
  }

  const driving = routes.get('driving');
  if (driving && !routes.has('rideshare')) {
    routes.set('rideshare', {
      ...driving,
      mode: 'rideshare',
      summary: driving.provenance.isFixture ? driving.summary : 'Rideshare follows the driving route',
      disruptions: [...driving.disruptions],
      path: driving.path.map((point) => ({ ...point })),
    });
  }

  if (demoPair) {
    for (const route of fixture.routes) {
      if (!routes.has(route.mode)) routes.set(route.mode, fromFixture(route));
    }
    if (!routes.has('rideshare')) {
      const fixtureDriving = fixture.routes.find((route) => route.mode === 'driving');
      if (fixtureDriving) {
        routes.set('rideshare', {
          ...fromFixture(fixtureDriving),
          mode: 'rideshare',
          summary: 'Rehearsal estimate — rideshare uses the driving time',
        });
      }
    }
  }

  const list = [...routes.values()];
  const recommended = list.find((route) => route.mode === fixture.recommendedMode) ?? list[0];
  if (!recommended) {
    return {
      ok: false,
      error: { status: 'no-data', message: 'No route is available for that trip.' },
    };
  }

  const result: MapsResponse = {
    ok: true,
    data: {
      origin,
      destination,
      routes: list,
      recommendedMode: fixture.recommendedMode,
      retrievedAt: (options.now ?? new Date()).toISOString(),
      provenance: recommended.provenance,
    },
  };
  if (cacheKey) cache.set(cacheKey, { at: Date.now(), value: result });
  return result;
}

function point(location: LatLng): string {
  return `${location.latitude},${location.longitude}`;
}

function placeFromAddress(address: string): MapPlace {
  return { name: address, address, location: { latitude: 0, longitude: 0 } };
}

function fromFixture(route: FixtureRoute): RouteAlternative {
  return {
    mode: route.mode,
    durationMinutes: route.durationMinutes,
    summary: route.summary,
    disruptions: [...route.disruptions],
    path: [],
    provenance: { source: 'fixture', isFixture: true },
  };
}
