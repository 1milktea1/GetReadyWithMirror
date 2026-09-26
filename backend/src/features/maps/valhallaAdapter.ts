// Public Valhalla instance for walking, driving, and cycling when no Google key is set.
// The Project OSRM demo server answers every profile with the car route, so it is not used.
// This host has no subway schedules. A failure falls through to the labeled fixture.

import type { LatLng, RouteAlternative, TransportMode } from '../../../../shared/contracts/maps/types.ts';
import { decodePolyline, simplifyPath } from './googleDirectionsAdapter.ts';

const VALHALLA_COSTING: Partial<Record<TransportMode, string>> = {
  driving: 'auto',
  walking: 'pedestrian',
  cycling: 'bicycle',
};

const VALHALLA_URL = 'https://valhalla1.openstreetmap.de/route';

export async function fetchValhallaRoute(options: {
  origin: LatLng;
  destination: LatLng;
  mode: TransportMode;
  fetchFn?: typeof fetch;
}): Promise<RouteAlternative | undefined> {
  const costing = VALHALLA_COSTING[options.mode];
  if (!costing) return undefined;

  const body = {
    locations: [
      { lat: options.origin.latitude, lon: options.origin.longitude },
      { lat: options.destination.latitude, lon: options.destination.longitude },
    ],
    costing,
    directions_options: { units: 'kilometers' },
  };
  const url = `${VALHALLA_URL}?json=${encodeURIComponent(JSON.stringify(body))}`;

  let payload: unknown;
  try {
    const response = await (options.fetchFn ?? fetch)(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return undefined;
    payload = await response.json();
  } catch {
    return undefined;
  }
  return mapValhallaRoute(payload, options.mode);
}

export function mapValhallaRoute(body: unknown, mode: TransportMode): RouteAlternative | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const trip = (body as { trip?: unknown }).trip;
  if (!trip || typeof trip !== 'object') return undefined;
  if ((trip as { status?: unknown }).status !== 0) return undefined;

  const seconds = (trip as { summary?: { time?: unknown } }).summary?.time;
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return undefined;

  const legs = (trip as { legs?: { shape?: unknown }[] }).legs;
  const path = Array.isArray(legs)
    ? legs.flatMap((leg) => (typeof leg?.shape === 'string' ? decodePolyline(leg.shape, 6) : []))
    : [];

  return {
    mode,
    durationMinutes: Math.max(1, Math.round(seconds / 60)),
    summary: 'Live road route',
    disruptions: [],
    path: simplifyPath(path),
    provenance: { source: 'valhalla', isFixture: false },
  };
}
