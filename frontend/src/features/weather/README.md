# Frontend Feature: Weather

**Owner:** carolynl950
**Status:** Not implemented

Renders the weather module in both compact and expanded form, and displays the grounded
clothing and essentials suggestions returned by the backend.

Expansion is driven by a typed UI event, not by string matching spoken phrases. This module
owns the expansion and fade animation; the assistant only requests it.

Suggestions displayed here must come from the fetched forecast and event context. Never render
invented conditions. Fixture-sourced data (`provenance.isFixture`) must be visibly labeled.

## Planned display

Values are shown in whatever units the backend returned (imperial by default, metric if chosen).
The location name sits above the temperature. It is Columbia University unless another city
is picked under "Location & units".

- **Compact tile (overview):** current temperature, condition, the afternoon high/low, and the
  most important suggestion.
- **Expanded view:** hourly outlook from now to the event, precipitation and UV, and every
  suggestion with its reason (for example "Umbrella — 70% chance of rain at 5 PM").
- **States:** loading, `external-provider-unavailable` ("Weather unavailable"), `no-data`,
  and a visible fixture label when applicable.

## Layout

Weather lives in the **left column** of the mirror, above the getting-ready plan and leave-by.
The calendar takes the right column, and the center stays empty so the user can see their
reflection. Expanding weather grows the panel downward in its column; it never covers the
center.

## Files

| File | Role |
|---|---|
| `WeatherPanel.tsx` | Compact tile, expanded details, loading and error states |
| `WeatherSettings.tsx` | Location search and °F/°C toggle, opened from "Location & units" in the expanded view |
| `useWeatherSettings.ts` | Remembers location choice and units in this browser (defaults: Columbia, imperial) |
| `useWeather.ts` | Fetches `/api/weather` for the current settings, refreshes every 10 minutes |
| `WeatherIcon.tsx` | Line icons for each normalized condition |
| `format.ts` | Display labels and time formatting |
| `weather.css` | Module styles, including the expand transition |

Types come from [`shared/contracts/weather/types.ts`](../../../../shared/contracts/weather/types.ts).

## Running

Two terminals:

```bash
cd backend && npm run dev:weather    # API on http://localhost:3001
cd frontend && npm install && npm run dev   # UI on http://localhost:5173
```

Until voice UI events exist, click the weather panel to expand it and press Escape to return
to the overview. Add `?now=2026-09-26T14:00:00-04:00` to the URL to test a demo time.

## Does NOT own

Weather provider requests, API credentials, or recommendation logic that belongs to the
backend weather feature. Suggestion rules and unit conversion are computed on the backend.
