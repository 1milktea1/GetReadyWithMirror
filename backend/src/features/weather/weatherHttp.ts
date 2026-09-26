// Framework-agnostic handlers for the weather HTTP API. The integration owner mounts these in
// backend/src/app/ once Express exists; until then devServer.ts serves them.
//
// GET /api/weather
//   lat, lon, name, tz — optional location; all four together, defaults to Columbia University
//   units              — optional "imperial" (default) or "metric"
//   now                — optional ISO 8601 demo/test-time override
//
// GET /api/weather/locations?q=<place name>
//   Up to five matching places, each usable as the location params above.

import { getWeather, searchLocations } from './weatherService.ts';
import type {
  LocationSearchResponse,
  UnitSystem,
  WeatherError,
  WeatherErrorStatus,
  WeatherLocation,
  WeatherResponse,
} from '../../../../shared/contracts/weather/types.ts';

const HTTP_STATUS: Record<WeatherErrorStatus, number> = {
  'input-invalid': 400,
  'no-data': 404,
  'external-provider-unavailable': 502,
};

type HttpResult<T> = { status: number; body: T };

const invalid = (message: string): HttpResult<{ ok: false; error: WeatherError }> => ({
  status: 400,
  body: { ok: false, error: { status: 'input-invalid', message } },
});

export async function handleWeatherRequest(query: URLSearchParams): Promise<HttpResult<WeatherResponse>> {
  const nowParam = query.get('now');
  let now: Date | undefined;
  if (nowParam) {
    now = new Date(nowParam);
    if (Number.isNaN(now.getTime())) return invalid(`Invalid "now" override: ${nowParam}`);
  }

  const unitsParam = query.get('units') ?? 'imperial';
  if (unitsParam !== 'imperial' && unitsParam !== 'metric') {
    return invalid('units must be "imperial" or "metric".');
  }

  const location = parseLocation(query);
  if (typeof location === 'string') return invalid(location);

  const result = await getWeather({ now, units: unitsParam as UnitSystem, location });
  return { status: result.ok ? 200 : HTTP_STATUS[result.error.status], body: result };
}

export async function handleLocationSearch(query: URLSearchParams): Promise<HttpResult<LocationSearchResponse>> {
  const result = await searchLocations(query.get('q') ?? '');
  return { status: result.ok ? 200 : HTTP_STATUS[result.error.status], body: result };
}

// Returns the location, undefined for the default, or an error message.
function parseLocation(query: URLSearchParams): WeatherLocation | undefined | string {
  const keys = ['lat', 'lon', 'name', 'tz'] as const;
  const provided = keys.filter((k) => query.has(k));
  if (provided.length === 0) return undefined;
  if (provided.length !== keys.length) return 'Location needs lat, lon, name, and tz together.';

  const latitude = Number(query.get('lat'));
  const longitude = Number(query.get('lon'));
  const name = query.get('name')!.trim();
  const timeZone = query.get('tz')!;

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return 'lat must be between -90 and 90.';
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return 'lon must be between -180 and 180.';
  if (name.length === 0 || name.length > 100) return 'name must be 1 to 100 characters.';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
  } catch {
    return `Unknown time zone: ${timeZone}`;
  }
  return { name, latitude, longitude, timeZone };
}
