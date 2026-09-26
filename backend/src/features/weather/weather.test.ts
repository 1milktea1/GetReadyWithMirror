import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildSuggestions } from './suggestions.ts';
import { getWeather, searchLocations } from './weatherService.ts';
import { toCondition, toIsoWithOffset } from './openMeteoAdapter.ts';
import { handleWeatherRequest } from './weatherHttp.ts';
import type { HourlyReading } from '../../../../shared/contracts/weather/types.ts';

// Imperial reading, as the adapter produces it.
function hour(overrides: Partial<HourlyReading> = {}): HourlyReading {
  return {
    time: '2026-09-26T15:00:00-04:00',
    temperature: 68,
    feelsLike: 68,
    condition: 'clear',
    precipitationProbability: 0,
    precipitation: 0,
    snowfall: 0,
    uvIndex: 1,
    windSpeed: 5,
    ...overrides,
  };
}

const items = (hours: HourlyReading[]) => buildSuggestions(hours).map((s) => s.item);

test('mild, dry, low-UV afternoon suggests nothing', () => {
  assert.deepEqual(items([hour()]), []);
});

test('umbrella at 40% rain probability, not at 39%', () => {
  assert.deepEqual(items([hour({ precipitationProbability: 39 })]), []);
  assert.deepEqual(items([hour({ precipitationProbability: 40 })]), ['umbrella']);
});

test('umbrella when rain is forecast even with low probability', () => {
  assert.deepEqual(items([hour({ condition: 'rain', precipitation: 0.05, precipitationProbability: 20 })]), ['umbrella']);
});

test('sunscreen at UV 3, sunglasses added at UV 6', () => {
  assert.deepEqual(items([hour({ uvIndex: 3 })]), ['sunscreen']);
  assert.deepEqual(items([hour({ uvIndex: 6 })]), ['sunscreen', 'sunglasses']);
});

test('snow suggests gloves and snow boots', () => {
  assert.deepEqual(items([hour({ snowfall: 0.2 })]), ['gloves', 'snow-boots']);
});

test('jacket below 50°F feels-like; heavy coat replaces it below 32°F', () => {
  assert.deepEqual(items([hour({ feelsLike: 49 })]), ['jacket']);
  assert.deepEqual(items([hour({ feelsLike: 31 })]), ['heavy-coat']);
});

test('windbreaker at 20 mph', () => {
  assert.deepEqual(items([hour({ windSpeed: 20 })]), ['windbreaker']);
});

test('suggestion carries the reading that triggered it', () => {
  const [umbrella] = buildSuggestions([hour(), hour({ time: '2026-09-26T17:00:00-04:00', precipitationProbability: 70 })]);
  assert.equal(umbrella.reason, '70% chance of rain around 5 PM');
  assert.deepEqual(umbrella.trigger, {
    metric: 'precipitationProbability',
    value: 70,
    time: '2026-09-26T17:00:00-04:00',
  });
});

test('metric: same rules fire, reasons and triggers are in metric', () => {
  const [coat, windbreaker] = buildSuggestions([hour({ feelsLike: 30.2, windSpeed: 20 })], 'metric');
  assert.equal(coat.item, 'heavy-coat');
  assert.equal(coat.reason, 'Feels like -1°C');
  assert.equal(coat.trigger.value, -1);
  assert.equal(windbreaker.reason, 'Wind up to 32 km/h');
});

test('adapter helpers: offset formatting and weather codes', () => {
  // 2026-09-26T18:00Z is 2 PM in New York (EDT, -4h).
  assert.equal(toIsoWithOffset(Date.UTC(2026, 8, 26, 18) / 1000, -4 * 3600), '2026-09-26T14:00:00-04:00');
  assert.equal(toCondition(0), 'clear');
  assert.equal(toCondition(63), 'rain');
  assert.equal(toCondition(75), 'snow');
  assert.equal(toCondition(null), 'unknown');
});

// Fake Open-Meteo forecast: hourly from 12 PM to 11 PM New York time on 2026-09-26.
function fakeForecastBody() {
  const offset = -4 * 3600;
  const times = Array.from({ length: 12 }, (_, i) => Date.UTC(2026, 8, 26, 16 + i) / 1000);
  return {
    utc_offset_seconds: offset,
    timezone: 'America/New_York',
    current: { time: times[2], temperature_2m: 70, apparent_temperature: 71, weather_code: 1, wind_speed_10m: 8 },
    hourly: {
      time: times,
      temperature_2m: times.map((_, i) => 72 - i),
      apparent_temperature: times.map((_, i) => 72 - i),
      precipitation_probability: times.map((_, i) => (i === 5 ? 80 : 10)), // 5 PM
      precipitation: times.map(() => 0.1),
      snowfall: times.map(() => 0),
      uv_index: times.map(() => 1),
      wind_speed_10m: times.map(() => 5),
      weather_code: times.map(() => 2),
    },
  };
}

function fakeFetch(body: unknown = fakeForecastBody(), seen: string[] = []): typeof fetch {
  return (async (url: string) => {
    seen.push(String(url));
    return new Response(JSON.stringify(body));
  }) as typeof fetch;
}

const TWO_THIRTY = new Date('2026-09-26T14:30:00-04:00');

test('getWeather windows the forecast from now to the event start', async () => {
  const res = await getWeather({ now: TWO_THIRTY, fetchFn: fakeFetch() });
  assert.ok(res.ok);
  const { data } = res;
  assert.equal(data.window.start, '2026-09-26T14:00:00-04:00');
  assert.equal(data.window.end, '2026-09-26T17:00:00-04:00');
  assert.equal(data.hourly.length, 4);
  assert.equal(data.summary.maxPrecipitationProbability, 80);
  assert.deepEqual(data.suggestions.map((s) => s.item), ['umbrella']);
  assert.equal(data.units.system, 'imperial');
  assert.equal(data.location.name, 'Columbia University');
  assert.equal(data.provenance.isFixture, false);
});

test('getWeather converts every value to metric when asked', async () => {
  const res = await getWeather({ now: TWO_THIRTY, units: 'metric', fetchFn: fakeFetch() });
  assert.ok(res.ok);
  const { data } = res;
  assert.equal(data.units.temperature, '°C');
  assert.equal(data.summary.high, 21.1); // 70°F
  assert.equal(data.hourly[0].temperature, 21.1);
  assert.equal(data.hourly[0].precipitation, 2.54); // 0.1 in
  assert.equal(data.hourly[0].windSpeed, 8); // 5 mph
  assert.equal(data.summary.totalPrecipitation, 10.16); // 4 hours × 2.54 mm
});

test('getWeather requests the chosen location and its time zone', async () => {
  const seen: string[] = [];
  const london = { name: 'London, England', latitude: 51.5085, longitude: -0.1257, timeZone: 'Europe/London' };
  // 2:30 PM New York is 7:30 PM London; the New York 5 PM dinner has not started yet.
  const res = await getWeather({ now: TWO_THIRTY, location: london, fetchFn: fakeFetch(undefined, seen) });
  assert.ok(res.ok);
  const params = new URL(seen[0]).searchParams;
  assert.equal(params.get('latitude'), '51.5085');
  assert.equal(params.get('timezone'), 'Europe/London');
});

test('overridden "now" uses that hour, not the provider\'s real-time current block', async () => {
  // Provider "current" is 2 PM (70°F); override to 4 PM, whose hourly temperature is 68°F.
  const res = await getWeather({ now: new Date('2026-09-26T16:10:00-04:00'), fetchFn: fakeFetch() });
  assert.ok(res.ok);
  assert.equal(res.data.current.temperature, 68);
});

test('after the dinner, the forecast continues through 11 PM', async () => {
  const res = await getWeather({ now: new Date('2026-09-26T17:30:00-04:00'), fetchFn: fakeFetch() });
  assert.ok(res.ok);
  assert.equal(res.data.window.end, '2026-09-26T23:00:00-04:00');
  assert.equal(res.data.hourly.length, 7);
});

test('getWeather rejects an explicit window that has already ended', async () => {
  const res = await getWeather({
    now: new Date('2026-09-26T17:30:00-04:00'),
    windowEnd: new Date('2026-09-26T17:00:00-04:00'),
    fetchFn: fakeFetch(),
  });
  assert.deepEqual(res.ok ? null : res.error.status, 'input-invalid');
});

test('getWeather reports provider failures instead of inventing data', async () => {
  const failing = (async () => new Response('down', { status: 503 })) as typeof fetch;
  const res = await getWeather({ now: TWO_THIRTY, fetchFn: failing });
  assert.deepEqual(res.ok ? null : res.error.status, 'external-provider-unavailable');
});

test('searchLocations maps geocoding results to labeled locations', async () => {
  const body = {
    results: [
      { name: 'London', latitude: 51.5, longitude: -0.12, timezone: 'Europe/London', admin1: 'England' },
      { name: 'Tokyo', latitude: 35.7, longitude: 139.7, timezone: 'Asia/Tokyo', admin1: 'Tokyo', country: 'Japan' },
      { name: 'Nowhere', latitude: 0, longitude: 0 }, // no time zone: dropped
    ],
  };
  const res = await searchLocations('London', fakeFetch(body));
  assert.ok(res.ok);
  assert.deepEqual(
    res.data.map((l) => l.name),
    ['London, England', 'Tokyo, Japan'],
  );
  assert.deepEqual(res.data[0], { name: 'London, England', latitude: 51.5, longitude: -0.12, timeZone: 'Europe/London' });
  assert.deepEqual(await searchLocations(' a '), {
    ok: false,
    error: { status: 'input-invalid', message: 'Search must be 2 to 100 characters.' },
  });
});

test('HTTP handler validates units and location params before calling the provider', async () => {
  const bad = async (qs: string) => (await handleWeatherRequest(new URLSearchParams(qs))).status;
  assert.equal(await bad('units=kelvin'), 400);
  assert.equal(await bad('lat=40&lon=-73'), 400); // incomplete location
  assert.equal(await bad('lat=91&lon=0&name=X&tz=UTC'), 400);
  assert.equal(await bad('lat=0&lon=0&name=X&tz=Mars/Base'), 400);
  assert.equal(await bad('now=bogus'), 400);
});
