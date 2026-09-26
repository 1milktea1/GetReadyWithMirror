# Contract: Weather Result

**Owner:** TBD
**Status:** Proposed — not agreed, not implemented
**Producer:** [`backend/src/features/weather/`](../../../backend/src/features/weather/README.md)

No TypeScript interfaces yet. This document describes the shape the team must agree on before
anyone implements against it.

## Fields to agree

| Field | Purpose | Decided? |
|---|---|---|
| Location | Which place the forecast describes | TBD |
| Forecast timestamp | When the provider produced the data | TBD |
| Time zone | Explicit zone for all timestamps | TBD |
| Current conditions | Conditions right now | TBD |
| Hourly outlook | Hour-by-hour across the event window | TBD |
| Precipitation summary | Rain/snow likelihood and intensity | TBD |
| Temperature summary | Range and feels-like across the window | TBD |
| Provenance / status | Live, cached, or labeled fixture | TBD |

## Open questions

- Units: imperial, metric, or both? The demo is in New York City.
- How is the "event window" bounded — event start only, or the full getting-ready period
  through arrival?
- How is a fixture flagged so the UI can visibly label it as synthetic?

## Consumers

- Backend assistant feature, via the `getWeather` tool.
- Frontend weather and overview modules.

## Change rule

Changing this contract requires notifying the other developer before merging. When
implementation has begun, the contract doc and all consumers are updated in the **same** pull
request. See [`docs/collaboration.md`](../../../docs/collaboration.md).
