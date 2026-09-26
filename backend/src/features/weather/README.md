# Backend Feature: Weather

**Owner:** carolynl950
**Status:** Not implemented — contract proposed, awaiting consumer sign-off
**Contract:** [`shared/contracts/weather/`](../../../../shared/contracts/weather/README.md)
**Provider:** [Open-Meteo](https://open-meteo.com) — no API key required

## Responsibility

Owns the weather provider adapter, the normalized forecast, the forecast slice covering
the event and getting-ready window, and the rule-based clothing/essentials suggestions. This
feature is the only place in the repository that knows the shape of the third-party weather
API response.

The outfit and packing suggestions surfaced to the user must be grounded in a forecast this
feature actually retrieved. Never fabricate live conditions.

## Planned public inputs

- Location: fixed to Columbia University for now. The event venue is out of scope until its
  address is decided.
- Reference "now", which must accept the demo/test-time override rather than reading the
  system clock directly. See [`docs/demo-scenario.md`](../../../../docs/demo-scenario.md).
- Event start, which ends the forecast window. Weather reads it from the calendar feature's
  public interface (interim stand-in below).

## Planned public outputs

A normalized forecast result in imperial units — see the
[contract](../../../../shared/contracts/weather/README.md) for proposed field names:

- Location and resolved time zone (`America/New_York`).
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

## Interim calendar stand-in

The calendar feature is not built yet. Until it is, weather uses a small local stand-in that
returns the synthetic 5 PM demo dinner, labeled as a fixture. It has the same call shape
weather will use against the calendar feature's public service, so switching over is a
one-line change.

- The stand-in lives inside this feature and is deleted once calendar's public service exists.
- It must not grow into a second calendar implementation.
- It returns only the event start; weather does not need the venue while location is fixed.

## Upstream dependencies

- Open-Meteo forecast API. No credentials, so no environment variable is needed. Requested in
  imperial units with `America/New_York` as the time zone.
- Event start from the calendar feature's **public interface** only (interim stand-in above).
  Do not import the calendar provider adapter.

## Downstream consumers

- The assistant feature, via the `getWeather` tool.
- The planner feature, via this feature's public service.
- The frontend overview and weather modules, via normalized backend responses.
- Never consumed by reaching into this feature's internals.

## Error states

Must return predictable, documented states rather than partial or invented data:

- `external-provider-unavailable` — Open-Meteo unreachable, rate limited, or erroring.
- `no-data` — provider reachable but no forecast for the requested location or window.
- `input-invalid` — unusable location or time window (for example, event start already past).

`not-configured` does not apply while the provider needs no key.

Each state needs a useful UI fallback. See
[`docs/api-contracts.md`](../../../../docs/api-contracts.md).

## Planned future files

Conventions for later work, not files to create now:

- A route or controller, if this feature is exposed over HTTP at `/api/weather`.
- Service logic holding the normalization, window-selection, and suggestion rules.
- A provider adapter isolating the Open-Meteo response shape.
- The interim calendar stand-in.
- Feature-local tests beside the code they cover, including each suggestion rule.

## Does NOT own

- React navigation or widget expansion behavior.
- Calendar data (it only reads the event start).
- Gemini calls.
