// Location search and unit toggle, shown inside the expanded weather view.
// Place search goes through the backend (/api/weather/locations); the browser never calls
// Open-Meteo directly.

import { useEffect, useState } from 'react';
import type { LocationSearchResponse, WeatherLocation } from '@contracts/weather/types';
import type { WeatherSettings as Settings } from './useWeatherSettings.ts';

interface WeatherSettingsProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

export function WeatherSettings({ settings, onChange }: WeatherSettingsProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WeatherLocation[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  // Under two characters there is nothing to search; hide any earlier results instead of clearing them.
  const searching = query.trim().length >= 2;

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/weather/locations?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const body = (await res.json()) as LocationSearchResponse;
        if (body.ok) {
          setResults(body.data);
          setMessage(body.data.length === 0 ? 'No places found.' : null);
        } else {
          setResults([]);
          setMessage(body.error.message);
        }
      } catch {
        if (!controller.signal.aborted) setMessage('Could not reach the mirror backend.');
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const choose = (location: WeatherLocation | null) => {
    onChange({ location });
    setQuery('');
    setResults([]);
  };

  return (
    // Keys typed here must not reach the panel's expand/collapse handler.
    <div className="weather-settings" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <div className="weather-settings-row">
        <span className="weather-settings-label">Units</span>
        <div className="weather-segmented" role="group" aria-label="Units">
          {(['imperial', 'metric'] as const).map((system) => (
            <button
              key={system}
              type="button"
              aria-pressed={settings.units === system}
              onClick={() => onChange({ units: system })}
            >
              {system === 'imperial' ? '°F' : '°C'}
            </button>
          ))}
        </div>
      </div>

      <div className="weather-settings-row weather-settings-row--stack">
        <label className="weather-settings-label" htmlFor="weather-location-search">
          Location
        </label>
        <input
          id="weather-location-search"
          className="weather-input"
          type="search"
          placeholder="Search a city"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) choose(results[0]);
          }}
        />
        {searching && results.length > 0 && (
          <ul className="weather-results">
            {results.map((r) => (
              <li key={`${r.latitude},${r.longitude}`}>
                <button type="button" onClick={() => choose(r)}>
                  {r.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {searching && message && <div className="weather-settings-message">{message}</div>}
        {settings.location && (
          <button type="button" className="weather-link" onClick={() => choose(null)}>
            Reset to Columbia University
          </button>
        )}
      </div>
    </div>
  );
}
