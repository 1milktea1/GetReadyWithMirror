# Backend Feature: Weather

**Owner:** carolynl950
**Status:** Working against live Open-Meteo — contract proposed, awaiting consumer sign-off
**Contract:** [`shared/contracts/weather/`](../../../../shared/contracts/weather/README.md)
**Provider:** [Open-Meteo](https://open-meteo.com) for forecasts and place search — no API key required

## Responsibility

Owns the weather provider adapter, the normalized forecast, the forecast slice from now
through the end of the local day, and the rule-based clothing/essentials suggestions. This
feature is the only place in the repository that knows the shape of the third-party weather
API response.

The outfit and packing suggestions surfaced to the user must be grounded in a forecast this
feature actually retrieved. Never fabricate live conditions.

## Planned public inputs

- Location: Columbia University (hardcoded default), or a place from the location search.
- Units: imperial by default, or metric.
- Reference "now", which must accept the demo/test-time override rather than reading the
  system clock directly. See [`docs/demo-scenario.md`](../../../../docs/demo-scenario.md).
- The forecast location's time zone, which sets midnight at the end of the displayed day.

## Planned public outputs

A normalized forecast result in the requested units — see the
[contract](../../../../shared/contracts/weather/README.md) for proposed field names:

- Location, its time zone, and the unit system used.
- Retrieval timestamp.
- Current conditions.
- Hourly outlook across the window.
- Precipitation and temperature summary, including max UV index.
- Suggestions (umbrella, sunscreen, gloves and snow gear, jacket, and so on), each with the
  reading that triggered it.
- Provenance and status (live provider response or labeled fixture).

## Suggestion rules

Suggestions are computed by deterministic rules in this feature, **not** by Gemini. Gemini
only words them. Thresholds live in the
[contract](../../../../shared/contracts/weather/README.md#suggestions); for example, rain
probability ≥ 40% suggests an umbrella, UV ≥ 3 suggests sunscreen, and any snowfall suggests
gloves and snow gear.

The provider is always queried in imperial units and the rules always run on imperial values.
`units.ts` converts to metric at the edge, including the numbers inside suggestion reasons.

## Upstream dependencies

- Open-Meteo forecast API. No credentials, so no environment variable is needed. Requested in
  imperial units, in the forecast location's time zone.

## Downstream consumers

- The assistant feature, via the `getWeather` tool.
- The planner feature, via this feature's public service.
- The frontend overview and weather modules, via normalized backend responses.
- Never consumed by reaching into this feature's internals.

## Error states

Must return predictable, documented states rather than partial or invented data:

- `external-provider-unavailable` — Open-Meteo unreachable, rate limited, or erroring.
- `no-data` — provider reachable but no forecast for the requested location or window.
- `input-invalid` — unusable location or time window (for example, a window end already past).

`not-configured` does not apply while the provider needs no key.

Each state needs a useful UI fallback. See
[`docs/api-contracts.md`](../../../../docs/api-contracts.md).

## Files

| File | Role |
|---|---|
| `weatherService.ts` | Public service: `getWeather({ location?, units?, now?, windowEnd? })` and `searchLocations(q)`. The only entry points other features use. |
| `openMeteoAdapter.ts` | Open-Meteo forecast and place-search requests and response mapping. Nothing else knows the provider's shape. |
| `suggestions.ts` | Deterministic suggestion rules and thresholds. |
| `units.ts` | Imperial-to-metric conversion. |
| `weatherHttp.ts` | Framework-agnostic handlers for `GET /api/weather` and `GET /api/weather/locations`, with input validation. |
| `devServer.ts` | **Interim** standalone server on port 3001. Delete once `weatherHttp.ts` is mounted in the integration-owned [`backend/src/app/`](../../app/README.md). |
| `weather.test.ts` | Rule and service tests against a fake provider response (no network). |

Result types live in [`shared/contracts/weather/types.ts`](../../../../shared/contracts/weather/types.ts),
shared with the frontend.

## Running

Requires Node 23.6+ (runs TypeScript directly; no packages to install). From `backend/`:

```bash
npm test               # offline tests
npm run dev:weather    # HTTP API on http://localhost:3001/api/weather
```

For a quick live check without the frontend, open
`http://localhost:3001/api/weather?now=2026-09-26T14:00:00-04:00` in a browser.

## Does NOT own

- React navigation or widget expansion behavior.
- Calendar data. The dinner time does not cut off the forecast.
- Gemini calls.
