// Weather result shape, per ./README.md. Status: proposed by the weather owner, not yet agreed.
// Type-only: imported by the backend weather feature and the frontend weather module.

export type UnitSystem = 'imperial' | 'metric';

export interface Units {
  system: UnitSystem;
  temperature: '°F' | '°C';
  windSpeed: 'mph' | 'km/h';
  precipitation: 'in' | 'mm';
  snowfall: 'in' | 'cm';
}

export interface WeatherLocation {
  name: string; // Display label, e.g. "Columbia University" or "London, England"
  latitude: number;
  longitude: number;
  timeZone: string; // IANA zone, e.g. "America/New_York"
}

export type Condition =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'thunderstorm'
  | 'unknown';

// All numeric values are in the result's `units`.
export interface Reading {
  temperature: number;
  feelsLike: number;
  condition: Condition;
  precipitationProbability: number; // percent
  uvIndex: number;
  windSpeed: number;
}

export interface HourlyReading extends Reading {
  time: string; // ISO 8601 with explicit offset, in the location's time zone
  precipitation: number;
  snowfall: number;
}

export type SuggestionItem =
  | 'umbrella'
  | 'sunscreen'
  | 'sunglasses'
  | 'gloves'
  | 'snow-boots'
  | 'jacket'
  | 'heavy-coat'
  | 'windbreaker';

export interface Suggestion {
  item: SuggestionItem;
  reason: string; // Already phrased in the result's units
  trigger: { metric: keyof HourlyReading; value: number; time: string };
}

export interface WeatherResult {
  location: WeatherLocation;
  units: Units;
  retrievedAt: string;
  timeZone: string;
  window: { start: string; end: string };
  current: Reading;
  hourly: HourlyReading[];
  summary: {
    high: number;
    low: number;
    minFeelsLike: number;
    maxUvIndex: number;
    maxPrecipitationProbability: number;
    totalPrecipitation: number;
    totalSnowfall: number;
  };
  suggestions: Suggestion[];
  provenance: { source: 'open-meteo' | 'fixture'; isFixture: boolean };
}

// Subset of the shared error vocabulary (docs/api-contracts.md) that weather can return.
export type WeatherErrorStatus = 'external-provider-unavailable' | 'no-data' | 'input-invalid';

export interface WeatherError {
  status: WeatherErrorStatus;
  message: string;
}

export type WeatherResponse = { ok: true; data: WeatherResult } | { ok: false; error: WeatherError };

export type LocationSearchResponse = { ok: true; data: WeatherLocation[] } | { ok: false; error: WeatherError };
