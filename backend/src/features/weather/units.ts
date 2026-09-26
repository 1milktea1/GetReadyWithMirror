// Imperial -> requested unit system. Forecasts arrive in imperial (see openMeteoAdapter.ts);
// everything leaving the service goes through here.

import type { HourlyReading, Reading, UnitSystem, Units } from '../../../../shared/contracts/weather/types.ts';

export const UNITS: Record<UnitSystem, Units> = {
  imperial: { system: 'imperial', temperature: '°F', windSpeed: 'mph', precipitation: 'in', snowfall: 'in' },
  metric: { system: 'metric', temperature: '°C', windSpeed: 'km/h', precipitation: 'mm', snowfall: 'cm' },
};

const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;

export function temperature(f: number, system: UnitSystem): number {
  return system === 'metric' ? round(((f - 32) * 5) / 9, 1) : f;
}

export function windSpeed(mph: number, system: UnitSystem): number {
  return system === 'metric' ? round(mph * 1.609344, 1) : mph;
}

export function precipitation(inches: number, system: UnitSystem): number {
  return system === 'metric' ? round(inches * 25.4, 2) : inches;
}

export function snowfall(inches: number, system: UnitSystem): number {
  return system === 'metric' ? round(inches * 2.54, 2) : inches;
}

// Converts a value by the name of the reading field it came from.
export function convertMetric(metric: keyof HourlyReading, value: number, system: UnitSystem): number {
  switch (metric) {
    case 'temperature':
    case 'feelsLike':
      return temperature(value, system);
    case 'windSpeed':
      return windSpeed(value, system);
    case 'precipitation':
      return precipitation(value, system);
    case 'snowfall':
      return snowfall(value, system);
    default:
      return value;
  }
}

export function convertReading(r: Reading, system: UnitSystem): Reading {
  return {
    ...r,
    temperature: temperature(r.temperature, system),
    feelsLike: temperature(r.feelsLike, system),
    windSpeed: windSpeed(r.windSpeed, system),
  };
}

export function convertHourly(h: HourlyReading, system: UnitSystem): HourlyReading {
  return {
    ...h,
    ...convertReading(h, system),
    precipitation: precipitation(h.precipitation, system),
    snowfall: snowfall(h.snowfall, system),
  };
}
