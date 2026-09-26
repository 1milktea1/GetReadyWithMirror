// Per-mirror weather preferences, remembered in this browser only.
// `location: null` means the backend default (Columbia University).

import { useCallback, useState } from 'react';
import type { UnitSystem, WeatherLocation } from '@contracts/weather/types';

export interface WeatherSettings {
  location: WeatherLocation | null;
  units: UnitSystem;
}

const STORAGE_KEY = 'grwm.weather.settings';
const DEFAULTS: WeatherSettings = { location: null, units: 'imperial' };

function load(): WeatherSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<WeatherSettings>;
    return {
      location: parsed.location ?? null,
      units: parsed.units === 'metric' ? 'metric' : 'imperial',
    };
  } catch {
    return DEFAULTS;
  }
}

export function useWeatherSettings() {
  const [settings, setSettings] = useState<WeatherSettings>(load);

  const update = useCallback((patch: Partial<WeatherSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable (private window, blocked): settings last for this session only.
      }
      return next;
    });
  }, []);

  return { settings, update };
}

export function weatherQuery(settings: WeatherSettings, now?: string): string {
  const params = new URLSearchParams({ units: settings.units });
  if (settings.location) {
    params.set('lat', String(settings.location.latitude));
    params.set('lon', String(settings.location.longitude));
    params.set('name', settings.location.name);
    params.set('tz', settings.location.timeZone);
  }
  if (now) params.set('now', now);
  return params.toString();
}
