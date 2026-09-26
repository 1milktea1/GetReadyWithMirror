// Maps public service. Other features call getCommute(); nothing imports the adapter except this file.

import { loadMapsFixture, sameAddress } from './fixtureAdapter.ts';
import type { MapsResponse, TransportMode } from '../../../../shared/contracts/maps/types.ts';

export interface GetCommuteOptions {
  /** When omitted, the fixture origin (Columbia University) is used. */
  originAddress?: string;
  /** When omitted, the fixture destination (Soothr) is used. */
  destinationAddress?: string;
  /** When the result was produced. Pass the demo clock; defaults to the real clock. */
  now?: Date;
}

const MODES: readonly TransportMode[] = ['transit', 'driving', 'walking', 'cycling'];

export function isTransportMode(value: string): value is TransportMode {
  return (MODES as readonly string[]).includes(value);
}

/**
 * Travel durations for a single origin/destination pair.
 * The demo fixture covers Columbia → Soothr only. Any other pair is `no-data`
 * rather than a guessed duration.
 */
export function getCommute(options: GetCommuteOptions = {}): MapsResponse {
  const fixture = loadMapsFixture();
  const origin = options.originAddress?.trim();
  const destination = options.destinationAddress?.trim();

  if (origin !== undefined && origin.length === 0) {
    return { ok: false, error: { status: 'input-invalid', message: 'Origin address is empty.' } };
  }
  if (destination !== undefined && destination.length === 0) {
    return { ok: false, error: { status: 'input-invalid', message: 'Destination address is empty.' } };
  }
  if (origin && !sameAddress(origin, fixture.origin.address)) {
    return {
      ok: false,
      error: {
        status: 'no-data',
        message: 'No fixture route from that origin, and live maps is not configured.',
      },
    };
  }
  if (destination && !sameAddress(destination, fixture.destination.address)) {
    return {
      ok: false,
      error: {
        status: 'no-data',
        message: 'No fixture route to that destination, and live maps is not configured.',
      },
    };
  }

  return {
    ok: true,
    data: {
      origin: fixture.origin,
      destination: fixture.destination,
      routes: fixture.routes.map((route) => ({ ...route, disruptions: [...route.disruptions] })),
      recommendedMode: fixture.recommendedMode,
      retrievedAt: (options.now ?? new Date()).toISOString(),
      provenance: { source: 'fixture', isFixture: true },
    },
  };
}
