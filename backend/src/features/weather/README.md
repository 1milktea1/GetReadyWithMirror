# Backend Feature: Weather

**Owner:** TBD
**Status:** Not implemented — contract not yet agreed
**Contract:** [`shared/contracts/weather/`](../../../../shared/contracts/weather/README.md)

## Responsibility

Owns the weather provider adapter, the normalized forecast, and the forecast slice covering
the event and getting-ready window. This feature is the only place in the repository that
knows the shape of the third-party weather API response.

The outfit and packing suggestions surfaced to the user must be grounded in a forecast this
feature actually retrieved. Never fabricate live conditions.

## Planned public inputs

- Location (the user's current location or the event venue).
- Time window of interest, derived from the event start and the getting-ready period.
- Reference "now", which must accept the demo/test-time override rather than reading the
  system clock directly. See [`docs/demo-scenario.md`](../../../../docs/demo-scenario.md).

## Planned public outputs

A normalized forecast result. Exact field names are TBD until the team agrees the contract:

- Location and resolved time zone.
- Forecast timestamp (when the provider produced the data).
- Current conditions.
- Hourly outlook across the event window.
- Precipitation and temperature summary.
- Provenance and status (live provider response, cached, or labeled fixture).

## Upstream dependencies

- A weather provider. Specific provider, account, and quota are TBD — see
  [`docs/decisions.md`](../../../../docs/decisions.md).
- Event timing and venue location from the calendar feature's **public interface** only.
  Do not import the calendar provider adapter.

## Downstream consumers

- The assistant feature, via the `getWeather` tool.
- The frontend overview and weather modules, via normalized backend responses.
- Never consumed by reaching into this feature's internals.

## Error states

Must return predictable, documented states rather than partial or invented data:

- `not-configured` — no provider credentials present.
- `external-provider-unavailable` — provider unreachable, rate limited, or erroring.
- `no-data` — provider reachable but no forecast for the requested location or window.
- `input-invalid` — unusable location or time window.

Each state needs a useful UI fallback. See
[`docs/api-contracts.md`](../../../../docs/api-contracts.md).

## Planned future files

Conventions for later work, not files to create now:

- A route or controller, if this feature is exposed over HTTP at `/api/weather`.
- Service logic holding the normalization and window-selection rules.
- A provider adapter isolating the third-party response shape.
- Feature-local tests beside the code they cover.

## Does NOT own

- React navigation or widget expansion behavior.
- Calendar fetches.
- Gemini calls.
