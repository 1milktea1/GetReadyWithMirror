import type { Condition, SuggestionItem } from '../../../../shared/contracts/weather/types.ts';

export const CONDITION_LABEL: Record<Condition, string> = {
  clear: 'Clear',
  'partly-cloudy': 'Partly cloudy',
  cloudy: 'Cloudy',
  fog: 'Fog',
  drizzle: 'Drizzle',
  rain: 'Rain',
  snow: 'Snow',
  thunderstorm: 'Thunderstorms',
  unknown: '—',
};

export const SUGGESTION_LABEL: Record<SuggestionItem, string> = {
  umbrella: 'Umbrella',
  sunscreen: 'Sunscreen',
  sunglasses: 'Sunglasses',
  gloves: 'Gloves',
  'snow-boots': 'Snow boots',
  jacket: 'Jacket',
  'heavy-coat': 'Heavy coat',
  windbreaker: 'Windbreaker',
};

export const degrees = (f: number) => `${Math.round(f)}°`;

// Backend timestamps are already in local time with an offset ("…T17:00:00-04:00"), so read the
// hour straight from the string rather than letting the browser's time zone shift it.
export function hourLabel(iso: string): string {
  const hour = Number(iso.slice(11, 13));
  return `${hour % 12 === 0 ? 12 : hour % 12} ${hour < 12 ? 'AM' : 'PM'}`;
}

export function clockLabel(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone }).format(new Date(iso));
}
