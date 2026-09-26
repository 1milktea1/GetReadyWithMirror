# Contract: Weather Result

**Owner:** carolynl950
**Status:** Proposed by owner — awaiting consumer sign-off, not implemented
**Producer:** [`backend/src/features/weather/`](../../../backend/src/features/weather/README.md)

TypeScript types: [`types.ts`](types.ts), imported by the backend weather feature and the
frontend weather module. Field names are the owner's proposal; consumers (assistant, planner)
confirm them before depending on them.

## Conventions

- **Units: selectable, imperial by default.** The caller asks for `imperial` (°F, mph, inches)
  or `metric` (°C, km/h, mm, cm of snow). Every numeric field is in the unit system named by
  the result's `units` block; field names carry no unit suffix.
- **Location: Columbia University by default** (hardcoded for now; device detection may come
  later). A place search overrides it. A location is `{ name, latitude, longitude, timeZone }`.
- **Time zone: the location's.** All timestamps are ISO 8601 with an explicit offset in the
  forecast location's time zone.

## Fields to agree

| Field | Proposed name | Purpose | Decided? |
|---|---|---|---|
| Location | `location` `{ name, latitude, longitude, timeZone }` | Which place the forecast describes | Proposed |
| Units | `units` `{ system, temperature, windSpeed, precipitation, snowfall }` | Which unit system every number is in, with display symbols | Proposed |
| Forecast timestamp | `retrievedAt` | When the data was fetched from the provider | Proposed |
| Time zone | `timeZone` | Explicit zone for all timestamps | Proposed |
| Window | `window` `{ start, end }` | The period the hourly outlook and summary cover | Proposed |
| Current conditions | `current` `{ temperature, feelsLike, condition, precipitationProbability, uvIndex, windSpeed }` | Conditions right now | Proposed |
| Hourly outlook | `hourly[]` — same fields as `current`, plus `time`, `precipitation`, `snowfall` | Hour-by-hour across the window | Proposed |
| Precipitation summary | `summary.maxPrecipitationProbability`, `summary.totalPrecipitation`, `summary.totalSnowfall` | Rain/snow likelihood and amount across the window | Proposed |
| Temperature summary | `summary.high`, `summary.low`, `summary.minFeelsLike`, `summary.maxUvIndex` | Range and feels-like across the window | Proposed |
| Suggestions | `suggestions[]` `{ item, reason, trigger: { metric, value, time } }` | What to wear or bring, and why, phrased in the result's units | Proposed |
| Provenance / status | `provenance` `{ source, isFixture }` | `open-meteo` live data, or a labeled fixture | Proposed |

## HTTP

| Request | Returns |
|---|---|
| `GET /api/weather` — optional `units`, `now`, and `lat`/`lon`/`name`/`tz` (all four or none) | `{ ok: true, data: WeatherResult }` or `{ ok: false, error }` |
| `GET /api/weather/locations?q=<place>` | Up to five `WeatherLocation`s, or an error |

`condition` is a short normalized label (for example `clear`, `rain`, `snow`). The provider's
numeric weather codes stay inside the provider adapter.

## Suggestions

Suggestions are produced by **deterministic rules** in the weather feature, not by Gemini.
Gemini may word them for speech; it may not invent new ones. Each suggestion carries the reading
that triggered it, so the UI and Gemini can explain it without guessing.

| Rule (anywhere in the window) | `item` |
|---|---|
| Precipitation probability ≥ 40%, or any rain forecast | `umbrella` |
| UV index ≥ 3 | `sunscreen` |
| UV index ≥ 6 | `sunglasses` |
| Any snowfall, or a snow condition | `gloves`, `snow-boots` |
| Minimum feels-like < 50°F | `jacket` |
| Minimum feels-like < 32°F | `heavy-coat` (replaces `jacket`) |
| Wind ≥ 20 mph | `windbreaker` |

Rules always evaluate imperial readings, whatever units the caller asked for, so the thresholds
above exist in one place only. Thresholds are the owner's starting values and may be tuned;
changing them does not change the contract shape.

## Resolved questions

- **Units:** imperial by default; metric on request.
- **Location:** Columbia University by default; any searchable place on request.
- **Day window:** from "now" (honoring the demo/test-time override) through the end of the
  forecast location's local day. The 11 PM hour is included. The next day's midnight hour is not.
- **Fixture flag:** `provenance.isFixture: true`, which the UI must render as a visible label.

## Open questions

- Does the planner need anything beyond `summary` and `suggestions`?

## Consumers

- Backend assistant feature, via the `getWeather` tool.
- Backend planner feature (conditions that may affect preparation).
- Frontend weather and overview modules.

## Change rule

Changing this contract requires notifying the other developer before merging. When
implementation has begun, the contract doc and all consumers are updated in the **same** pull
request. See [`docs/collaboration.md`](../../../docs/collaboration.md).
