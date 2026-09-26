// Open-Meteo provider adapter. The only file that knows Open-Meteo's request and response shape.
// Docs: https://open-meteo.com/en/docs and https://open-meteo.com/en/docs/geocoding-api — no key.
//
// Forecasts are always requested in imperial units. The service converts at the edge, so the
// suggestion rules only ever see one unit system.

import type { Condition, HourlyReading, Reading, WeatherLocation } from '../../../../shared/contracts/weather/types.ts';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const TIMEOUT_MS = 10_000;

const HOURLY_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation_probability',
  'precipitation',
  'snowfall',
  'uv_index',
  'wind_speed_10m',
  'weather_code',
] as const;

const CURRENT_FIELDS = ['temperature_2m', 'apparent_temperature', 'weather_code', 'wind_speed_10m'] as const;

interface OpenMeteoResponse {
  utc_offset_seconds: number;
  timezone: string;
  current: { time: number } & Record<(typeof CURRENT_FIELDS)[number], number>;
  hourly: { time: number[] } & Record<(typeof HOURLY_FIELDS)[number], (number | null)[]>;
}

interface GeocodingResponse {
  results?: {
    name: string;
    latitude: number;
    longitude: number;
    timezone?: string;
    admin1?: string;
    country?: string;
  }[];
}

// Imperial values: °F, mph, inches.
export interface ProviderForecast {
  timeZone: string;
  current: Omit<Reading, 'precipitationProbability' | 'uvIndex'> & { time: string };
  hourly: HourlyReading[];
}

export class ProviderError extends Error {}

export async function fetchForecast(location: WeatherLocation, fetchFn: typeof fetch = fetch): Promise<ProviderForecast> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: CURRENT_FIELDS.join(','),
    hourly: HOURLY_FIELDS.join(','),
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    timezone: location.timeZone,
    timeformat: 'unixtime',
    forecast_days: '2',
  });

  const body = await getJson<OpenMeteoResponse>(`${FORECAST_URL}?${params}`, fetchFn);
  const offset = body.utc_offset_seconds;
  const h = body.hourly;

  const hourly: HourlyReading[] = h.time.map((t, i) => ({
    time: toIsoWithOffset(t, offset),
    temperature: h.temperature_2m[i] ?? NaN,
    feelsLike: h.apparent_temperature[i] ?? NaN,
    condition: toCondition(h.weather_code[i]),
    precipitationProbability: h.precipitation_probability[i] ?? 0,
    precipitation: h.precipitation[i] ?? 0,
    snowfall: h.snowfall[i] ?? 0,
    uvIndex: h.uv_index[i] ?? 0,
    windSpeed: h.wind_speed_10m[i] ?? 0,
  }));

  return {
    timeZone: body.timezone,
    current: {
      time: toIsoWithOffset(body.current.time, offset),
      temperature: body.current.temperature_2m,
      feelsLike: body.current.apparent_temperature,
      condition: toCondition(body.current.weather_code),
      windSpeed: body.current.wind_speed_10m,
    },
    hourly,
  };
}

export async function searchPlaces(query: string, fetchFn: typeof fetch = fetch): Promise<WeatherLocation[]> {
  const params = new URLSearchParams({ name: query, count: '5', language: 'en', format: 'json' });
  const body = await getJson<GeocodingResponse>(`${GEOCODING_URL}?${params}`, fetchFn);
  return (body.results ?? [])
    .filter((r) => r.timezone)
    .map((r) => ({
      // "London, England"; fall back to the country when the region repeats the name ("Tokyo, Japan").
      name: [r.name, r.admin1 && r.admin1 !== r.name ? r.admin1 : r.country].filter(Boolean).join(', '),
      latitude: r.latitude,
      longitude: r.longitude,
      timeZone: r.timezone!,
    }));
}

async function getJson<T>(url: string, fetchFn: typeof fetch): Promise<T> {
  let res: Response;
  try {
    res = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    throw new ProviderError(`Open-Meteo request failed: ${(err as Error).message}`);
  }
  if (!res.ok) {
    throw new ProviderError(`Open-Meteo returned HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

// Unix seconds -> "2026-09-26T14:00:00-04:00" in the provider's local offset.
export function toIsoWithOffset(unixSeconds: number, offsetSeconds: number): string {
  const local = new Date((unixSeconds + offsetSeconds) * 1000).toISOString().slice(0, 19);
  const sign = offsetSeconds < 0 ? '-' : '+';
  const abs = Math.abs(offsetSeconds);
  const hh = String(Math.floor(abs / 3600)).padStart(2, '0');
  const mm = String(Math.floor((abs % 3600) / 60)).padStart(2, '0');
  return `${local}${sign}${hh}:${mm}`;
}

// WMO weather interpretation codes, as documented by Open-Meteo.
export function toCondition(code: number | null | undefined): Condition {
  if (code == null) return 'unknown';
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'partly-cloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95 && code <= 99) return 'thunderstorm';
  return 'unknown';
}
