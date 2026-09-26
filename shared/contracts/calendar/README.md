# Contract: Calendar Event

**Owner:** TBD
**Status:** Draft implemented in [`index.ts`](index.ts) — used by the frontend, not yet reviewed
by the other developer
**Producer:** [`backend/src/features/calendar/`](../../../backend/src/features/calendar/README.md)
(today, the frontend fixture source stands in)

The TypeScript types in [`index.ts`](index.ts) are the source of truth. Everything is
JSON-serializable, so the backend can return a `CalendarResult` from `GET /api/calendar`
unchanged.

## `CalendarEvent`

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable identifier |
| `title` | string | Display name |
| `start` | string | ISO 8601 instant, e.g. `2026-09-26T21:00:00.000Z` |
| `end` | string | ISO 8601 instant |
| `venueName` | string, optional | Display name of the location |
| `venueAddress` | string, optional | Routing destination for maps |

Times are **instants**, not wall-clock strings, so there is no ambiguity across zones or
daylight-saving changes. The zone to *display* them in travels once on the result.

## `CalendarResult`

| Field | Type | Notes |
|---|---|---|
| `status` | `ok` \| `no-data` \| `not-authorized` \| `not-configured` \| `external-provider-unavailable` | Matches the shared error vocabulary |
| `provenance` | `live` \| `fixture` | The UI labels fixtures as `Sample data` |
| `timeZone` | string | IANA zone, `America/New_York` for the demo |
| `retrievedAt` | string | ISO 8601 instant the data was produced |
| `events` | `CalendarEvent[]` | Empty unless `status` is `ok` |

The result carries events **around** now, including ones already in progress. Choosing which
are "upcoming" is the consumer's job: the frontend drops ended events and shows the next four.

## Still open

- **All-day events.** Google Calendar has them; this draft does not. Add an `allDay` flag, or
  represent them as midnight-to-midnight instants?
- **Venue address shape.** Free-form string, or structured enough for the maps feature to route
  without re-geocoding?
- **Lookahead window.** How far ahead should the backend fetch — rest of today, 48 hours, a
  week?
- **Multiple calendars.** Primary only, or merged from several?

## Consumers

- Frontend calendar module — **implemented**.
- Backend planner feature (event start and venue) — planned.
- Backend maps feature (destination address) — planned.
- Backend weather feature (event window) — planned.
- Backend assistant feature, via the `getUpcomingEvent` tool — planned.

## Change rule

Changing this contract requires notifying the other developer before merging. Now that
implementation has begun, the contract, its docs, and all consumers are updated in the **same**
pull request. See [`docs/collaboration.md`](../../../docs/collaboration.md).
