# Contract: Weather Result

**Owner:** carolynl950
**Status:** Proposed by owner — awaiting consumer sign-off, not implemented
**Producer:** [`backend/src/features/weather/`](../../../backend/src/features/weather/README.md)

No TypeScript interfaces yet. This document describes the shape the team must agree on before
anyone implements against it. Field names below are the owner's proposal; consumers (assistant,
planner) confirm them before implementation.

## Conventions

- **Units: imperial.** °F, mph, inches. Unit is part of the field name (`temperatureF`,
  `windMph`, `precipitationIn`) so nothing is ambiguous.
- **Time zone: `America/New_York`.** All timestamps are ISO 8601 with an explicit offset.
- **Location: Columbia University only** for now (fixed coordinates). The event venue is out
  of scope until its address is decided (D8 in [`docs/decisions.md`](../../../docs/decisions.md)).

## Fields to agree

| Field | Proposed name | Purpose | Decided? |
|---|---|---|---|
| Location | `location` `{ name, latitude, longitude }` | Which place the forecast describes | Proposed |
| Forecast timestamp | `retrievedAt` | When the data was fetched from the provider | Proposed |
| Time zone | `timeZone` | Explicit zone for all timestamps | Proposed |
| Window | `window` `{ start, end }` | The period the hourly outlook and summary cover | Proposed |
| Current conditions | `current` `{ temperatureF, feelsLikeF, condition, precipitationProbability, uvIndex, windMph }` | Conditions right now | Proposed |
| Hourly outlook | `hourly[]` — same fields as `current`, plus `time`, `precipitationIn`, `snowfallIn` | Hour-by-hour across the window | Proposed |
| Precipitation summary | `summary.maxPrecipitationProbability`, `summary.totalPrecipitationIn`, `summary.totalSnowfallIn` | Rain/snow likelihood and amount across the window | Proposed |
| Temperature summary | `summary.highF`, `summary.lowF`, `summary.minFeelsLikeF`, `summary.maxUvIndex` | Range and feels-like across the window | Proposed |
| Suggestions | `suggestions[]` `{ item, reason, trigger: { metric, value, time } }` | What to wear or bring, and why | Proposed |
| Provenance / status | `provenance` `{ source, isFixture }` | `open-meteo` live data, or a labeled fixture | Proposed |

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

Thresholds are the owner's starting values and may be tuned; changing them does not change the
contract shape.

## Resolved questions

- **Units:** imperial only.
- **Location:** Columbia University only for now.
- **Event window:** from "now" (honoring the demo/test-time override) to the event start.
  Weather obtains the event start from the calendar feature's public interface. Until that
  exists, it uses an interim stand-in — see the
  [backend weather README](../../../backend/src/features/weather/README.md#interim-calendar-stand-in).
- **Fixture flag:** `provenance.isFixture: true`, which the UI must render as a visible label.

## Open questions

- Does the planner need anything beyond `summary` and `suggestions`?
- Should the window extend past event start to cover the walk home after dinner?

## Consumers

- Backend assistant feature, via the `getWeather` tool.
- Backend planner feature (conditions that may affect preparation).
- Frontend weather and overview modules.

## Change rule

Changing this contract requires notifying the other developer before merging. When
implementation has begun, the contract doc and all consumers are updated in the **same** pull
request. See [`docs/collaboration.md`](../../../docs/collaboration.md).
