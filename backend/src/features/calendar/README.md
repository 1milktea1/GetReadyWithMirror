# Backend Feature: Calendar

**Owner:** TBD
**Status:** Fixture reader only (`fixtureCalendar.ts`). The frontend still loads
`fixtures/calendar/demo-day.json` itself. Google Calendar is not connected.

`getNextTravelEvent(now)` is the public read the planner uses: the soonest event that has not
ended and has a street address. On the demo day that is dinner at Soothr.
**Contract:** [`shared/contracts/calendar/`](../../../../shared/contracts/calendar/README.md)

## What the frontend expects from this feature

`GET /api/calendar` returning a `CalendarResult` from
[`shared/contracts/calendar/index.ts`](../../../../shared/contracts/calendar/index.ts): event
times as ISO 8601 instants, `provenance: 'live'`, and provider or OAuth failures mapped onto
the contract's `status` values rather than thrown. Return events around now, including any
already in progress; the frontend chooses which to show.

Once this exists, the frontend swap is one line — see
[`frontend/src/features/calendar/`](../../../../frontend/src/features/calendar/README.md#going-live-with-google-calendar).

## Responsibility

Owns the calendar provider adapter, the upcoming event details and location, and the
authorization boundary for calendar access. This feature is the only place that handles
calendar credentials and the only place that knows the provider's response shape.

The demo event is synthetic until real calendar access is configured. Synthetic events must
be visibly labeled as fixtures.

## Planned public inputs

- Reference "now", honoring the demo/test-time override.
- A lookahead window or a request for the next relevant event.
- Authorization state for the connected account.

## Planned public outputs

A normalized calendar event. Exact field names are TBD:

- Event ID.
- Title.
- Start and end, each with an explicit time zone.
- Venue name and address, when the provider supplies them.
- Provenance and status (live, synthetic fixture, or unauthorized).

## Upstream dependencies

- A calendar provider. Google Calendar is planned but not configured; account setup, scopes,
  and quotas are TBD — see [`docs/decisions.md`](../../../../docs/decisions.md).

## Downstream consumers

- The planner feature, which needs the event start time and venue to compute a leave-by time.
- The maps feature, which needs the venue address as a routing destination.
- The weather feature, which needs the event window.
- The assistant feature, via the `getUpcomingEvent` tool.
- The frontend overview and calendar modules.

## Error states

- `not-authorized` — the user has not granted calendar access.
- `not-configured` — no provider credentials present.
- `no-data` — authorized, but no upcoming event in the window.
- `external-provider-unavailable` — provider unreachable or erroring.

Teammates must be able to build against a documented fixture while authorization is pending.
Calendar access is explicitly not allowed to block other features.

## Planned future files

- A route or controller, if exposed over HTTP at `/api/calendar`.
- Service logic for event selection and normalization.
- A provider adapter isolating the calendar API.
- Feature-local tests.

## Does NOT own

- Route calculations.
- Weather recommendations.

## Note on writes

Modifying a real calendar event is a **confirmation-required** action. The planner must never
silently change the reservation. See [`docs/permissions.md`](../../../../docs/permissions.md).
