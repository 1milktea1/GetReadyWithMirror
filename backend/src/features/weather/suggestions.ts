// Deterministic clothing/essentials rules. Thresholds match
// shared/contracts/weather/README.md#suggestions — change both together.
//
// Rules always evaluate imperial readings (°F, mph, inches). Reasons and trigger values are
// written in the requested unit system.

import type { HourlyReading, Suggestion, UnitSystem } from '../../../../shared/contracts/weather/types.ts';
import { UNITS, convertMetric } from './units.ts';

export const THRESHOLDS = {
  rainProbability: 40,
  sunscreenUv: 3,
  sunglassesUv: 6,
  jacketFeelsLikeF: 50,
  heavyCoatFeelsLikeF: 32,
  windbreakerMph: 20,
} as const;

const WET_CONDITIONS = new Set(['drizzle', 'rain', 'thunderstorm']);

export function buildSuggestions(hours: HourlyReading[], system: UnitSystem = 'imperial'): Suggestion[] {
  if (hours.length === 0) return [];
  const units = UNITS[system];
  const suggestions: Suggestion[] = [];
  const at = (time: string) => formatHour(time);
  const trigger = (metric: keyof HourlyReading, h: HourlyReading) => ({
    metric,
    value: convertMetric(metric, h[metric] as number, system),
    time: h.time,
  });

  const wettest = maxBy(hours, (h) => h.precipitationProbability);
  const rainyHour = hours.find((h) => WET_CONDITIONS.has(h.condition) && h.precipitation > 0);
  if (wettest.precipitationProbability >= THRESHOLDS.rainProbability) {
    suggestions.push({
      item: 'umbrella',
      reason: `${wettest.precipitationProbability}% chance of rain around ${at(wettest.time)}`,
      trigger: trigger('precipitationProbability', wettest),
    });
  } else if (rainyHour) {
    suggestions.push({
      item: 'umbrella',
      reason: `${rainyHour.condition} expected around ${at(rainyHour.time)}`,
      trigger: trigger('precipitation', rainyHour),
    });
  }

  const sunniest = maxBy(hours, (h) => h.uvIndex);
  if (sunniest.uvIndex >= THRESHOLDS.sunscreenUv) {
    const t = trigger('uvIndex', sunniest);
    const uv = Math.round(sunniest.uvIndex);
    suggestions.push({ item: 'sunscreen', reason: `UV index ${uv} around ${at(sunniest.time)}`, trigger: t });
    if (sunniest.uvIndex >= THRESHOLDS.sunglassesUv) {
      suggestions.push({ item: 'sunglasses', reason: `High UV index (${uv})`, trigger: t });
    }
  }

  const snowyHour = hours.find((h) => h.snowfall > 0 || h.condition === 'snow');
  if (snowyHour) {
    const t = trigger('snowfall', snowyHour);
    const reason = `Snow expected around ${at(snowyHour.time)}`;
    suggestions.push({ item: 'gloves', reason, trigger: t }, { item: 'snow-boots', reason, trigger: t });
  }

  const coldest = minBy(hours, (h) => h.feelsLike);
  const coldTrigger = trigger('feelsLike', coldest);
  const coldReason = `Feels like ${Math.round(coldTrigger.value)}${units.temperature}`;
  if (coldest.feelsLike < THRESHOLDS.heavyCoatFeelsLikeF) {
    suggestions.push({ item: 'heavy-coat', reason: coldReason, trigger: coldTrigger });
  } else if (coldest.feelsLike < THRESHOLDS.jacketFeelsLikeF) {
    suggestions.push({ item: 'jacket', reason: coldReason, trigger: coldTrigger });
  }

  const windiest = maxBy(hours, (h) => h.windSpeed);
  if (windiest.windSpeed >= THRESHOLDS.windbreakerMph) {
    const t = trigger('windSpeed', windiest);
    suggestions.push({ item: 'windbreaker', reason: `Wind up to ${Math.round(t.value)} ${units.windSpeed}`, trigger: t });
  }

  return suggestions;
}

// "2026-09-26T17:00:00-04:00" -> "5 PM". The ISO string is already in local time.
function formatHour(iso: string): string {
  const hour = Number(iso.slice(11, 13));
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${hour % 12 === 0 ? 12 : hour % 12} ${suffix}`;
}

function maxBy<T>(items: T[], score: (item: T) => number): T {
  return items.reduce((best, item) => (score(item) > score(best) ? item : best));
}

function minBy<T>(items: T[], score: (item: T) => number): T {
  return items.reduce((best, item) => (score(item) < score(best) ? item : best));
}
