// Public OSRM router for walking, driving, and cycling when no Google key is set.
// It has no subway schedules. The demo server is a live road network, not our fixture.

import type { LatLng, RouteAlternative, TransportMode } from '../../../../shared/contracts/maps/types.ts';
import { simplifyPath } from './googleDirectionsAdapter.ts';

const OSRM_PROFILE: Partial<Record<TransportMode, string>> = {
  driving: 'driving',
  walking: 'walking',
  cycling: 'cycling',
};

export async function fetchOsrmRoute(options: {
  origin: LatLng;
  destination: LatLng;
  mode: TransportMode;
  fetchFn?: typeof fetch;
}): Promise<RouteAlternative | undefined> {
  const profile = OSRM_PROFILE[options.mode];
  if (!profile) return undefined;

  const path = `${options.origin.longitude},${options.origin.latitude};${options.destination.longitude},${options.destination.latitude}`;
  const url = `https://router.project-osrm.org/route/v1/${profile}/${path}?overview=full&geometries=geojson`;

  let body: unknown;
  try {
    const response = await (options.fetchFn ?? fetch)(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return undefined;
    body = await response.json();
  } catch {
    return undefined;
  }
  return mapOsrmRoute(body, options.mode);
}

export function mapOsrmRoute(body: unknown, mode: TransportMode): RouteAlternative | undefined {
  if (!body || typeof body !== 'object') return undefined;
  if ((body as { code?: unknown }).code !== 'Ok') return undefined;
  const route = (body as { routes?: unknown[] }).routes?.[0];
  if (!route || typeof route !== 'object') return undefined;
  const seconds = (route as { duration?: unknown }).duration;
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return undefined;

  const coordinates = (route as { geometry?: { coordinates?: unknown } }).geometry?.coordinates;
  const path = Array.isArray(coordinates)
    ? coordinates.flatMap((pair) => {
        if (!Array.isArray(pair) || pair.length < 2) return [];
        const longitude = pair[0];
        const latitude = pair[1];
        if (typeof latitude !== 'number' || typeof longitude !== 'number') return [];
        return [{ latitude, longitude }];
      })
    : [];

  return {
    mode,
    durationMinutes: Math.max(1, Math.round(seconds / 60)),
    summary: 'Live road route',
    disruptions: [],
    path: simplifyPath(path),
    provenance: { source: 'osrm', isFixture: false },
  };
}
