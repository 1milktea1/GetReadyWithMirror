// GET /api/maps
//   origin       — optional address; defaults to Columbia University
//   destination  — optional address; defaults to Soothr, 204 E 13th St
//   now          — optional ISO 8601 demo/test-time override (stamps retrievedAt only)

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

export function handleMapsRequest(query: URLSearchParams): HttpResult<MapsResponse> {
  const nowParam = query.get('now');
  let now: Date | undefined;
  if (nowParam) {
    now = new Date(nowParam);
    if (Number.isNaN(now.getTime())) return invalid(`Invalid "now" override: ${nowParam}`);
  }

  const result = getCommute({
    originAddress: query.get('origin') ?? undefined,
    destinationAddress: query.get('destination') ?? undefined,
    now,
  });
  return { status: result.ok ? 200 : HTTP_STATUS[result.error.status], body: result };
}
