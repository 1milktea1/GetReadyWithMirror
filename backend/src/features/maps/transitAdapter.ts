// Schedule-based subway routing from the public Transitous MOTIS router.
// It returns the walk-to-station, train, and walk-to-door geometry. It is not a
// straight line between the two pins. Google Directions is preferred when a key is set.

import type { LatLng, RouteAlternative, RouteLeg } from '../../../../shared/contracts/maps/types.ts';
import { decodePolyline, simplifyPath } from './googleDirectionsAdapter.ts';
import { subwayLineColor, walkLegColor } from './subwayLineColor.ts';

const TRANSIT_URL = 'https://api.transitous.org/api/v6/plan';

// Campus pin is ~2 minutes from the 1 at 116 St. Transitous's pedestrian graph
// cannot leave the quad, so it walks 21 minutes to the 2/3 and reports ~54 min.
// Route from the 116 St–Columbia University entrance so the subway time matches
// the ~33 minute trip Google and Apple show for this pair.
const COLUMBIA_CAMPUS = { latitude: 40.8075, longitude: -73.9626 };
const COLUMBIA_1_TRAIN = { latitude: 40.807722, longitude: -73.964105 };

export function transitAccessPoint(origin: LatLng): LatLng {
  return samePoint(origin, COLUMBIA_CAMPUS) ? COLUMBIA_1_TRAIN : origin;
}

function samePoint(a: LatLng, b: LatLng): boolean {
  return Math.abs(a.latitude - b.latitude) < 1e-4 && Math.abs(a.longitude - b.longitude) < 1e-4;
}

export async function fetchTransitRoute(options: {
  origin: LatLng;
  destination: LatLng;
  departure?: Date;
  fetchFn?: typeof fetch;
}): Promise<RouteAlternative | undefined> {
  const params = new URLSearchParams({
    fromPlace: point(transitAccessPoint(options.origin)),
    toPlace: point(options.destination),
    // SUBWAY-only skipped the 1 train from campus and forced a long walk to the 2/3.
    // TRANSIT still requires a subway leg below; buses may only finish the last few blocks.
    transitModes: 'TRANSIT',
    maxPreTransitTime: '900',
    maxPostTransitTime: '1800',
    numItineraries: '8',
  });
  if (options.departure && !Number.isNaN(options.departure.getTime())) {
    params.set('time', options.departure.toISOString());
  }
  const url = `${TRANSIT_URL}?${params}`;

  let payload: unknown;
  try {
    const response = await (options.fetchFn ?? fetch)(url, {
      headers: {
        Accept: 'application/json',
        // Transitous rejects a generic client user-agent.
        'User-Agent': 'GetReadyWithMirror/demo',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return undefined;
    payload = await response.json();
  } catch {
    return undefined;
  }
  return mapTransitRoute(payload);
}

export function mapTransitRoute(body: unknown): RouteAlternative | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const itineraries = (body as { itineraries?: unknown }).itineraries;
  if (!Array.isArray(itineraries)) return undefined;

  const ranked = itineraries
    .map(readItinerary)
    .filter((item): item is TransitItinerary => item !== undefined && item.subway)
    .sort((a, b) => a.durationSeconds - b.durationSeconds);
  const best = ranked[0];
  if (!best || best.path.length < 2) return undefined;

  return {
    mode: 'transit',
    durationMinutes: Math.max(1, Math.round(best.durationSeconds / 60)),
    summary: best.lines.length > 0 ? `Subway ${best.lines.join(' · ')}` : 'Live subway',
    disruptions: [],
    path: simplifyPath(best.path, 120),
    legs: best.legs,
    provenance: { source: 'transitous', isFixture: false },
  };
}

interface TransitItinerary {
  durationSeconds: number;
  subway: boolean;
  lines: string[];
  path: LatLng[];
  legs: RouteLeg[];
}

function readItinerary(value: unknown): TransitItinerary | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const seconds = (value as { duration?: unknown }).duration;
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return undefined;
  const legs = (value as { legs?: unknown }).legs;
  if (!Array.isArray(legs)) return undefined;

  const lines: string[] = [];
  const path: LatLng[] = [];
  const colored: RouteLeg[] = [];
  let subway = false;
  for (const leg of legs) {
    if (!leg || typeof leg !== 'object') continue;
    const mode = (leg as { mode?: unknown }).mode;
    const encoded = (leg as { legGeometry?: { points?: unknown } }).legGeometry?.points;
    const segment = typeof encoded === 'string' && encoded.length > 0 ? simplifyPath(decodePolyline(encoded, 6), 80) : [];
    if (mode === 'SUBWAY') {
      subway = true;
      const name = (leg as { routeShortName?: unknown }).routeShortName;
      const tint = (leg as { routeColor?: unknown }).routeColor;
      if (typeof name === 'string' && name && lines.at(-1) !== name) lines.push(name);
      if (segment.length >= 2) {
        colored.push({
          kind: 'subway',
          line: typeof name === 'string' ? name : undefined,
          color: subwayLineColor(typeof name === 'string' ? name : '', typeof tint === 'string' ? tint : undefined),
          path: segment,
        });
      }
    } else if (segment.length >= 2) {
      colored.push({ kind: mode === 'WALK' ? 'walk' : 'other', color: walkLegColor(), path: segment });
    }
    if (segment.length > 0) path.push(...segment);
  }
  return { durationSeconds: seconds, subway, lines, path, legs: colored };
}

function point(location: LatLng): string {
  return `${location.latitude},${location.longitude}`;
}
