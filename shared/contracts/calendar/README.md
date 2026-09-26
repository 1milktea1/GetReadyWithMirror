# Contract: Calendar Event

**Owner:** TBD
**Status:** Proposed — not agreed, not implemented
**Producer:** [`backend/src/features/calendar/`](../../../backend/src/features/calendar/README.md)

No TypeScript interfaces yet. This document describes the shape the team must agree on before
anyone implements against it.

## Fields to agree

| Field | Purpose | Decided? |
|---|---|---|
| ID | Stable event identifier | TBD |
| Title | Display name of the event | TBD |
| Start | Start time with explicit time zone | TBD |
| End | End time with explicit time zone | TBD |
| Venue name | Display name of the location, if provided | TBD |
| Venue address | Routing destination, if provided | TBD |
| Provenance / status | Live, synthetic fixture, or unauthorized | TBD |

The demo event is **synthetic** until calendar access is configured, and must be labeled as
such.

## Open questions

- Is the venue address a free-form string, or structured enough for the maps feature to route
  reliably without re-geocoding?
- What happens when an event has no location at all?
- How is "the upcoming event" selected — next event, next event within N hours, or the first
  event after the overridden demo time?

## Consumers

- Backend planner feature (event start and venue).
- Backend maps feature (destination address).
- Backend weather feature (event window).
- Backend assistant feature, via the `getUpcomingEvent` tool.
- Frontend calendar and overview modules.

## Change rule

Changing this contract requires notifying the other developer before merging. When
implementation has begun, the contract doc and all consumers are updated in the **same** pull
request. See [`docs/collaboration.md`](../../../docs/collaboration.md).
