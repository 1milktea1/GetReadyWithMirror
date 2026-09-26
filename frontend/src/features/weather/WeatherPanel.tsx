// Weather module: compact tile on the overview, expanded view on request.
// Renders backend results only; suggestion rules and unit conversion happen on the backend.

import { useEffect, useState, type ReactNode } from 'react';
import type { WeatherResult } from '../../../../shared/contracts/weather/types.ts';
import { useWeather } from './useWeather.ts';
import { useWeatherSettings, weatherQuery } from './useWeatherSettings.ts';
import { WeatherIcon } from './WeatherIcon.tsx';
import { WeatherSettings } from './WeatherSettings.tsx';
import { CONDITION_LABEL, SUGGESTION_LABEL, clockLabel, degrees, hourLabel } from './format.ts';
import './weather.css';

interface WeatherPanelProps {
  expanded: boolean;
  onToggle: () => void;
  // Demo/test-time override, passed through to the backend.
  now?: string;
}

export function WeatherPanel({ expanded, onToggle, now }: WeatherPanelProps) {
  const { settings, update } = useWeatherSettings();
  const { state, retry } = useWeather(weatherQuery(settings, now));
  // In the expanded view, settings replace the hourly table so the column never overflows.
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!expanded) setShowSettings(false);
  }, [expanded]);

  const settingsPanel = <WeatherSettings settings={settings} onChange={update} />;

  if (state.status === 'loading') {
    return <div className="weather weather--status">Loading weather…</div>;
  }

  if (state.status === 'error') {
    return (
      <div className="weather weather--status" role="alert">
        <div className="weather-status-title">Weather unavailable</div>
        <div className="weather-status-detail">{state.error.message}</div>
        <button className="weather-retry" onClick={retry}>
          Retry
        </button>
        {/* Always reachable here, so a location that fails can be changed back. */}
        {settingsPanel}
      </div>
    );
  }

  const { data } = state;
  return (
    <div className={`weather ${expanded ? 'weather--expanded' : ''}`}>
      <div
        className="weather-toggle"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
      >
        <Summary data={data} />
        <Suggestions data={data} limit={expanded ? undefined : 2} />
      </div>
      <div className="weather-details" aria-hidden={!expanded}>
        <div className="weather-details-inner">
          {showSettings ? settingsPanel : <Hourly data={data} />}
          <Footer data={data} now={now}>
            <button type="button" className="weather-link" onClick={() => setShowSettings(!showSettings)}>
              {showSettings ? 'Done' : 'Location & units'}
            </button>
          </Footer>
        </div>
      </div>
    </div>
  );
}

function Summary({ data }: { data: WeatherResult }) {
  const { current, summary } = data;
  return (
    <div className="weather-summary">
      <div className="weather-place">{data.location.name}</div>
      <div className="weather-now">
        <WeatherIcon condition={current.condition} size="0.8em" />
        <span className="weather-temp">{degrees(current.temperature)}</span>
      </div>
      <div className="weather-line">
        {CONDITION_LABEL[current.condition]} · Feels like {degrees(current.feelsLike)}
      </div>
      <div className="weather-line weather-muted">
        H {degrees(summary.high)} L {degrees(summary.low)} · Rain {summary.maxPrecipitationProbability}% · until{' '}
        {hourLabel(data.window.end)}
      </div>
    </div>
  );
}

function Suggestions({ data, limit }: { data: WeatherResult; limit?: number }) {
  if (data.suggestions.length === 0) {
    return <div className="weather-suggestions weather-muted">Nothing extra to bring.</div>;
  }
  return (
    <ul className="weather-suggestions">
      {data.suggestions.slice(0, limit).map((s) => (
        <li key={s.item} className="weather-suggestion">
          <span className="weather-suggestion-item">{SUGGESTION_LABEL[s.item]}</span>
          <span className="weather-suggestion-reason">{s.reason}</span>
        </li>
      ))}
    </ul>
  );
}

const MAX_HOURLY_ROWS = 8;

// Long windows (for example a far-away time zone) are thinned to fit the column, always keeping
// the first hour and the event hour.
function sampleHours<T>(hours: T[]): T[] {
  if (hours.length <= MAX_HOURLY_ROWS) return hours;
  const step = Math.ceil((hours.length - 1) / (MAX_HOURLY_ROWS - 1));
  return hours.filter((_, i) => i % step === 0 || i === hours.length - 1).slice(-MAX_HOURLY_ROWS);
}

function Hourly({ data }: { data: WeatherResult }) {
  return (
    <table className="weather-hourly">
      <tbody>
        {sampleHours(data.hourly).map((h) => (
          <tr key={h.time}>
            <td className="weather-muted">{hourLabel(h.time)}</td>
            <td>
              <WeatherIcon condition={h.condition} size="1.6em" />
            </td>
            <td>{degrees(h.temperature)}</td>
            <td className="weather-muted">{h.precipitationProbability}%</td>
            <td className="weather-muted">UV {Math.round(h.uvIndex)}</td>
            <td className="weather-muted">
              {Math.round(h.windSpeed)} {data.units.windSpeed}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Footer({ data, now, children }: { data: WeatherResult; now?: string; children?: ReactNode }) {
  return (
    <div className="weather-footer">
      {children}
      {data.provenance.isFixture && <span className="weather-badge">Sample data — not live</span>}
      {now && <span className="weather-badge">Demo time {hourLabel(data.window.start)}</span>}
      <span>
        Open-Meteo · updated {clockLabel(data.retrievedAt, data.timeZone)} {shortZone(data.retrievedAt, data.timeZone)}
      </span>
    </div>
  );
}

function shortZone(iso: string, timeZone: string): string {
  return (
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
      .formatToParts(new Date(iso))
      .find((p) => p.type === 'timeZoneName')?.value ?? ''
  );
}
