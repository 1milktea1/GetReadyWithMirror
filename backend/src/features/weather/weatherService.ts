// Weather public service. Other features call getWeather(); nothing imports the adapter directly.

import { fetchForecast, ProviderError, searchPlaces } from './openMeteoAdapter.ts';
import { buildSuggestions } from './suggestions.ts';
import { UNITS, convertHourly, convertReading, precipitation, snowfall, temperature } from './units.ts';
import type {
  LocationSearchResponse,
  UnitSystem,
  WeatherLocation,
  WeatherResponse,
} from '../../../../shared/contracts/weather/types.ts';

export const COLUMBIA: WeatherLocation = {
  name: 'Columbia University',
  latitude: 40.8075,
  longitude: -73.9626,
  timeZone: 'America/New_York',
};

export interface GetWeatherOptions {
  // Defaults to Columbia University, the demo location.
  location?: WeatherLocation;
  // Defaults to imperial.
  units?: UnitSystem;
  // Reference "now". Pass the demo/test-time override here; defaults to the system clock.
  now?: Date;
  // Exclusive end of the forecast window. Defaults to midnight at the end of the local day.
  windowEnd?: Date;
  fetchFn?: typeof fetch;
}

export async function getWeather(options: GetWeatherOptions = {}): Promise<WeatherResponse> {
  const location = options.location ?? COLUMBIA;
  const system = options.units ?? 'imperial';
  const now = options.now ?? new Date();
  // Hourly times are displayed in the forecast location's time zone. The window runs through
  // the end of that local day, not the dinner reservation.
  const windowEnd = options.windowEnd ?? endOfLocalDay(now, location.timeZone);

  if (windowEnd.getTime() <= now.getTime()) {
    return {
      ok: false,
      error: { status: 'input-invalid', message: 'The forecast window has already ended.' },
    };
  }

  let forecast;
  try {
    forecast = await fetchForecast(location, options.fetchFn);
  } catch (err) {
    if (err instanceof ProviderError) {
      return { ok: false, error: { status: 'external-provider-unavailable', message: err.message } };
    }
    throw err;
  }

  // Include the hour already in progress, up to but not including the exclusive window end.
  const windowStartMs = now.getTime() - 60 * 60 * 1000;
  const inWindow = forecast.hourly.filter((h) => {
    const t = Date.parse(h.time);
    return t > windowStartMs && t < windowEnd.getTime();
  });
  const currentHour = inWindow[0];

  if (!currentHour) {
    return { ok: false, error: { status: 'no-data', message: 'No forecast hours cover the requested window.' } };
  }

  // The provider's "current" block reflects the real clock. When "now" is overridden to a
  // different hour, use that hour's forecast instead so the result is self-consistent.
  const providerCurrentIsNow = Math.abs(Date.parse(forecast.current.time) - now.getTime()) < 60 * 60 * 1000;
  const current = providerCurrentIsNow ? forecast.current : currentHour;

  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
  const round2 = (n: number) => Math.round(n * 100) / 100;

  return {
    ok: true,
    data: {
      location,
      units: UNITS[system],
      retrievedAt: new Date().toISOString(),
      timeZone: forecast.timeZone,
      window: { start: currentHour.time, end: inWindow[inWindow.length - 1].time },
      current: convertReading(
        {
          temperature: current.temperature,
          feelsLike: current.feelsLike,
          condition: current.condition,
          windSpeed: current.windSpeed,
          precipitationProbability: currentHour.precipitationProbability,
          uvIndex: currentHour.uvIndex,
        },
        system,
      ),
      hourly: inWindow.map((h) => convertHourly(h, system)),
      summary: {
        high: temperature(Math.max(...inWindow.map((h) => h.temperature)), system),
        low: temperature(Math.min(...inWindow.map((h) => h.temperature)), system),
        minFeelsLike: temperature(Math.min(...inWindow.map((h) => h.feelsLike)), system),
        maxUvIndex: Math.max(...inWindow.map((h) => h.uvIndex)),
        maxPrecipitationProbability: Math.max(...inWindow.map((h) => h.precipitationProbability)),
        totalPrecipitation: round2(precipitation(sum(inWindow.map((h) => h.precipitation)), system)),
        totalSnowfall: round2(snowfall(sum(inWindow.map((h) => h.snowfall)), system)),
      },
      // Rules run on the imperial readings; output is phrased in the requested units.
      suggestions: buildSuggestions(inWindow, system),
      provenance: { source: 'open-meteo', isFixture: false },
    },
  };
}

// Midnight that ends the local calendar day containing `now`. Exclusive: the 11 PM hour is in
// range, and the next day's midnight hour is not.
function endOfLocalDay(now: Date, timeZone: string): Date {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
  const [year, month, day] = date.split('-').map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
  const offsetAt = (instant: Date) => {
    const value = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(instant)
      .find((part) => part.type === 'timeZoneName')
      ?.value.replace('GMT', '');
    return value || 'Z';
  };
  const midnight = new Date(`${nextDate}T00:00:00${offsetAt(now)}`);
  const refined = offsetAt(midnight);
  return refined === offsetAt(now) ? midnight : new Date(`${nextDate}T00:00:00${refined}`);
}

export async function searchLocations(query: string, fetchFn?: typeof fetch): Promise<LocationSearchResponse> {
  const q = query.trim();
  if (q.length < 2 || q.length > 100) {
    return { ok: false, error: { status: 'input-invalid', message: 'Search must be 2 to 100 characters.' } };
  }
  try {
    return { ok: true, data: await searchPlaces(q, fetchFn) };
  } catch (err) {
    if (err instanceof ProviderError) {
      return { ok: false, error: { status: 'external-provider-unavailable', message: err.message } };
    }
    throw err;
  }
}
