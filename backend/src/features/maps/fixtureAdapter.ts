// Fixture-backed routing adapter. The only place that reads the maps fixture file.
// Durations are rehearsal numbers. This adapter never invents a route for an address
// the fixture does not cover, and it never calls a live maps provider.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { LatLng, MapPlace, TransportMode } from '../../../../shared/contracts/maps/types.ts';

export interface FixtureRoute {
  mode: TransportMode;
  durationMinutes: number;
  summary: string;
  disruptions: string[];
}

export interface MapsFixture {
  origin: MapPlace;
  destination: MapPlace;
  recommendedMode: TransportMode;
  routes: FixtureRoute[];
}

const MODES: readonly TransportMode[] = ['transit', 'driving', 'walking', 'cycling', 'rideshare'];

function isMode(value: unknown): value is TransportMode {
  return typeof value === 'string' && (MODES as readonly string[]).includes(value);
}

function isLatLng(value: unknown): value is LatLng {
  if (!value || typeof value !== 'object') return false;
  const point = value as LatLng;
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude);
}

function isPlace(value: unknown): value is MapPlace {
  if (!value || typeof value !== 'object') return false;
  const place = value as MapPlace;
  return (
    typeof place.name === 'string' &&
    place.name.length > 0 &&
    typeof place.address === 'string' &&
    place.address.length > 0 &&
    isLatLng(place.location)
  );
}

function isRoute(value: unknown): value is FixtureRoute {
  if (!value || typeof value !== 'object') return false;
  const route = value as FixtureRoute;
  return (
    isMode(route.mode) &&
    Number.isInteger(route.durationMinutes) &&
    route.durationMinutes > 0 &&
    typeof route.summary === 'string' &&
    Array.isArray(route.disruptions) &&
    route.disruptions.every((item) => typeof item === 'string')
  );
}

let cached: MapsFixture | undefined;

/** The Columbia → Soothr rehearsal routes. Cached after the first read. */
export function loadMapsFixture(): MapsFixture {
  if (cached) return cached;
  const path = fileURLToPath(new URL('../../../../fixtures/maps/columbia-to-soothr.json', import.meta.url));
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!raw || typeof raw !== 'object') throw new Error('Maps fixture is not an object.');
  const fixture = raw as Partial<MapsFixture>;
  if (!isPlace(fixture.origin) || !isPlace(fixture.destination) || !isMode(fixture.recommendedMode)) {
    throw new Error('Maps fixture is missing origin, destination, or recommendedMode.');
  }
  if (!Array.isArray(fixture.routes) || fixture.routes.length === 0 || !fixture.routes.every(isRoute)) {
    throw new Error('Maps fixture routes are missing or malformed.');
  }
  if (!fixture.routes.some((route) => route.mode === fixture.recommendedMode)) {
    throw new Error(`Maps fixture has no route for recommended mode ${fixture.recommendedMode}.`);
  }
  cached = {
    origin: fixture.origin,
    destination: fixture.destination,
    recommendedMode: fixture.recommendedMode,
    routes: fixture.routes.map((route) => ({ ...route, disruptions: [...route.disruptions] })),
  };
  return cached;
}

/** Case- and punctuation-insensitive comparison so "204 E 13th St" matches the fixture. */
export function sameAddress(a: string, b: string): boolean {
  const normalize = (value: string) => value.trim().toLowerCase().replace(/[.,#]/g, '').replace(/\s+/g, ' ');
  return normalize(a) === normalize(b);
}
