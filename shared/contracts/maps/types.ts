// Maps result shape. Status: proposed for the offline demo, not yet agreed (decisions D2).
// Type-only: imported by the backend maps feature and, later, the frontend maps module.
// Live provider response shapes stay inside the maps adapter and never appear here.

export type TransportMode = 'transit' | 'driving' | 'walking' | 'cycling' | 'rideshare';

export type RouteSource = 'google' | 'valhalla' | 'fixture';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface MapPlace {
  name: string;
  address: string;
  location: LatLng;
}

export interface RouteAlternative {
  mode: TransportMode;
  /** Whole minutes. Fixture values are rehearsal numbers, not a live retrieval. */
  durationMinutes: number;
  summary: string;
  disruptions: string[];
  /** Road or transit path to draw. Empty when only the places are known. */
  path: LatLng[];
  provenance: { source: RouteSource; isFixture: boolean };
}

export interface MapsResult {
  origin: MapPlace;
  destination: MapPlace;
  routes: RouteAlternative[];
  /** Mode used when the caller does not choose one. Subway / transit for the demo. */
  recommendedMode: TransportMode;
  /** ISO 8601 instant the result was produced. */
  retrievedAt: string;
  /** Provenance of the recommended route. Each route also carries its own. */
  provenance: { source: RouteSource; isFixture: boolean };
}

export type MapsErrorStatus =
  | 'not-configured'
  | 'external-provider-unavailable'
  | 'no-data'
  | 'input-invalid';

export interface MapsError {
  status: MapsErrorStatus;
  message: string;
}

export type MapsResponse = { ok: true; data: MapsResult } | { ok: false; error: MapsError };
