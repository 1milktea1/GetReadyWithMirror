# API Contracts

**Status:** Index. Weather, calendar, maps, and planner have proposed TypeScript shapes.
Maps and planner are implemented. Maps prefers Google Directions, then Valhalla for road modes,
then a labeled fixture. Nothing here is team-agreed yet (D2).

## Contract index

| Contract | Document | Producer | Agreed? |
|---|---|---|---|
| Weather result | [`shared/contracts/weather/`](../shared/contracts/weather/README.md) | Weather feature | No |
| Calendar event | [`shared/contracts/calendar/`](../shared/contracts/calendar/README.md) | Calendar feature | No |
| Maps result | [`shared/contracts/maps/`](../shared/contracts/maps/README.md) | Maps feature | Proposed in `types.ts` |
| Planner input/output | [`shared/contracts/planner/`](../shared/contracts/planner/README.md) | Planner feature | Proposed in `types.ts` |
| Agent tools | [`shared/contracts/assistant/`](../shared/contracts/assistant/README.md) | Assistant feature | No |
| UI event envelope | [`shared/contracts/events/`](../shared/contracts/events/README.md) | Integration owner | No |

## Summary of what each must carry

**Weather result** — location, forecast timestamp and time zone, current conditions, hourly
outlook across the event window, precipitation and temperature summary, provenance/status.

**Calendar event** — ID, title, start and end with time zone, venue name and address if
provided, provenance/status. The demo event is synthetic until calendar access is configured.

**Maps result** — normalized origin and destination, route alternatives, transport modes,
estimated durations and reported disruptions, retrieval timestamp, provider/status. An exact
event address is required for accurate routing.

**Planner input** — current (or overridden demo) time, event time, venue, route duration,
preferred arrival buffer, named preparation tasks and durations.
**Planner output** — a feasible schedule, **or** an explicit conflict with suggested
adjustments.

**Agent tools** — `expandWidget`, `collapseWidget`, `showOverview`, `getWeather`,
`getUpcomingEvent`, `getCommute`, `generatePreparationPlan`, `updateTaskDuration`,
`markTaskComplete`, and optionally `getPreferences`. Argument and result shapes are confirmed
**jointly**. See [`permissions.md`](permissions.md).

**UI event envelope** — action name, target widget where relevant, request/correlation ID,
optional payload, timestamp. Must support expansion and return to overview.

## Error conventions

One shared vocabulary, so the frontend renders one consistent set of fallbacks:

| State | Meaning |
|---|---|
| `not-authorized` | Access not granted (calendar, microphone) |
| `not-configured` | Credentials or setup missing |
| `no-data` | Succeeded, nothing to return |
| `external-provider-unavailable` | Upstream provider unreachable or erroring |
| `input-invalid` | Unusable arguments |
| `schedule-conflict` | Tasks do not fit before the deadline |

Every state must expose a useful UI fallback state. **Never substitute fabricated live data**
for an error. `schedule-conflict` is a legitimate answer, not a failure.

Exact naming and serialization are TBD — see
[`backend/src/shared/errors/`](../backend/src/shared/errors/README.md).

## Likely API namespaces

**Namespaces to discuss, not endpoints to create today.**

```text
/api/weather
/api/calendar
/api/maps
/api/planner
/api/assistant
/health
```

Voice may get a dedicated namespace or be folded into integrated session endpoints. Undecided
— record the outcome in [`decisions.md`](decisions.md).

## Contract change process

1. Propose the change to the other developer **before** merging.
2. Update the contract document.
3. Once implementation has begun, update the contract **and all consumers in the same pull
   request**.
4. For [`shared/contracts/events/`](../shared/contracts/events/README.md), route the change
   through the integration owner.
