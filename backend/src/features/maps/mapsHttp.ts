// GET /api/maps
//   origin       — optional address; defaults to Columbia University
//   destination  — optional address; defaults to the next calendar event with a venue
//   now          — optional ISO 8601 demo/test-time override. Stamps retrievedAt.
//                Google uses it as departure_time only when it is not in the past.

import { getNextTravelEvent } from '../calendar/fixtureCalendar.ts';
import { getCommute } from './mapsService.ts';
import type { MapsError, MapsErrorStatus, MapsResponse } from '../../../../shared/contracts/maps/types.ts';

const HTTP_STATUS: Record<MapsErrorStatus, number> = {
  'input-invalid': 400,
  'no-data': 404,
  'not-configured': 503,
  'external-provider-unavailable': 502,
};

type HttpResult<T> = { status: number; body: T };

const invalid = (message: string): HttpResult<{ ok: false; error: MapsError }> => ({
  status: 400,
  body: { ok: false, error: { status: 'input-invalid', message } },
});

export async function handleMapsRequest(query: URLSearchParams): Promise<HttpResult<MapsResponse>> {
  const nowParam = query.get('now');
  let now: Date | undefined;
  if (nowParam) {
    now = new Date(nowParam);
    if (Number.isNaN(now.getTime())) return invalid(`Invalid "now" override: ${nowParam}`);
  }

  const destinationQuery = query.get('destination') ?? undefined;
  const next = destinationQuery ? undefined : getNextTravelEvent(now ?? new Date());
  const result = await getCommute({
    originAddress: query.get('origin') ?? undefined,
    destinationAddress: destinationQuery ?? (next?.ok ? next.event.venueAddress : undefined),
    destinationName: destinationQuery ? undefined : next?.ok ? next.event.venueName : undefined,
    now,
  });
  return { status: result.ok ? 200 : HTTP_STATUS[result.error.status], body: result };
}
