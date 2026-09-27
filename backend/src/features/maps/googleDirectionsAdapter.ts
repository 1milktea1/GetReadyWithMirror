// Google Directions. The API key stays in this process; responses are mapped to the
// maps contract before they leave the adapter. Rideshare is not a Directions mode.

import type { LatLng, RouteAlternative, RouteLeg, TransportMode } from '../../../../shared/contracts/maps/types.ts';
import { subwayLineColor, walkLegColor } from './subwayLineColor.ts';

const GOOGLE_MODE: Partial<Record<TransportMode, string>> = {
  transit: 'transit',
  driving: 'driving',
  walking: 'walking',
  cycling: 'bicycling',
};

export function googleMapsApiKey(): string | undefined {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  return key ? key : undefined;
}

/** Encoded polyline → coordinates. Google uses precision 5; Valhalla uses 6. */
export function decodePolyline(encoded: string, precision = 5): LatLng[] {
  const factor = 10 ** precision;
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const path: LatLng[] = [];

  const next = (): number => {
    let result = 0;
    let shift = 0;
    let byte = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    latitude += next();
    longitude += next();
    path.push({ latitude: latitude / factor, longitude: longitude / factor });
  }
  return path;
}

export async function fetchGoogleRoute(options: {
  origin: string;
  destination: string;
  mode: TransportMode;
  departure?: Date;
  apiKey: string;
  fetchFn?: typeof fetch;
}): Promise<RouteAlternative | undefined> {
  const googleMode = GOOGLE_MODE[options.mode];
  if (!googleMode) return undefined;

  const params = new URLSearchParams({
    origin: options.origin,
    destination: options.destination,
    mode: googleMode,
    key: options.apiKey,
  });
  const departure = departureSeconds(options.departure);
  if (departure !== undefined && (options.mode === 'transit' || options.mode === 'driving')) {
    params.set('departure_time', String(departure));
  }

  const url = `https://maps.googleapis.com/maps/api/directions/json?${params}`;
  let body: unknown;
  try {
    const response = await (options.fetchFn ?? fetch)(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return undefined;
    body = await response.json();
  } catch {
    return undefined;
  }
  return mapGoogleRoute(body, options.mode);
}

export function mapGoogleRoute(body: unknown, mode: TransportMode): RouteAlternative | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const status = (body as { status?: unknown }).status;
  if (status !== 'OK') return undefined;
  const route = (body as { routes?: unknown[] }).routes?.[0];
  if (!route || typeof route !== 'object') return undefined;
  const leg = (route as { legs?: unknown[] }).legs?.[0];
  if (!leg || typeof leg !== 'object') return undefined;
  const seconds = (leg as { duration?: { value?: unknown } }).duration?.value;
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return undefined;

  const encoded = (route as { overview_polyline?: { points?: unknown } }).overview_polyline?.points;
  const warnings = (route as { warnings?: unknown[] }).warnings;
  const legs = mode === 'transit' ? readGoogleTransitLegs((leg as { steps?: unknown }).steps) : [];
  const lines = legs.filter((item) => item.kind === 'subway' && item.line).map((item) => item.line as string);
  const path = legs.length > 0 ? legs.flatMap((item) => item.path) : simplifyPath(typeof encoded === 'string' ? decodePolyline(encoded) : []);
  return {
    mode,
    durationMinutes: Math.max(1, Math.round(seconds / 60)),
    summary: lines.length > 0 ? `Subway ${lines.join(' · ')}` : 'Live directions',
    disruptions: Array.isArray(warnings) ? warnings.filter((item): item is string => typeof item === 'string') : [],
    path,
    legs: legs.length > 0 ? legs : undefined,
    provenance: { source: 'google', isFixture: false },
  };
}

function readGoogleTransitLegs(steps: unknown): RouteLeg[] {
  if (!Array.isArray(steps)) return [];
  const legs: RouteLeg[] = [];
  for (const step of steps) {
    if (!step || typeof step !== 'object') continue;
    const encoded = (step as { polyline?: { points?: unknown } }).polyline?.points;
    const path = typeof encoded === 'string' ? simplifyPath(decodePolyline(encoded), 60) : [];
    if (path.length < 2) continue;
    const mode = (step as { travel_mode?: unknown }).travel_mode;
    if (mode === 'TRANSIT') {
      const line = (step as { transit_details?: { line?: { short_name?: unknown; color?: unknown; vehicle?: { type?: unknown } } } })
        .transit_details?.line;
      const name = typeof line?.short_name === 'string' ? line.short_name : undefined;
      const vehicle = typeof line?.vehicle?.type === 'string' ? line.vehicle.type : '';
      const subway = vehicle === 'SUBWAY' || Boolean(name);
      legs.push({
        kind: subway ? 'subway' : 'other',
        line: name,
        color: subway && name ? subwayLineColor(name, typeof line?.color === 'string' ? line.color : undefined) : walkLegColor(),
        path,
      });
      continue;
    }
    legs.push({ kind: 'walk', color: walkLegColor(), path });
  }
  return legs;
}

function departureSeconds(now: Date | undefined): number | undefined {
  if (!now) return undefined;
  // Directions rejects a departure in the past. A demo clock earlier today still
  // gets a live ETA; the planner applies that duration to the demo clock.
  if (now.getTime() < Date.now() - 60_000) return undefined;
  return Math.floor(now.getTime() / 1000);
}

export function simplifyPath(path: LatLng[], maxPoints = 80): LatLng[] {
  if (path.length <= maxPoints) return path;
  const step = (path.length - 1) / (maxPoints - 1);
  const sampled: LatLng[] = [];
  for (let i = 0; i < maxPoints; i += 1) sampled.push(path[Math.round(i * step)]!);
  return sampled;
}
