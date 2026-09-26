# Contract: Maps Result

**Owner:** TBD
**Status:** Proposed — not agreed, not implemented
**Producer:** [`backend/src/features/maps/`](../../../backend/src/features/maps/README.md)

No TypeScript interfaces yet. This document describes the shape the team must agree on before
anyone implements against it.

## Fields to agree

| Field | Purpose | Decided? |
|---|---|---|
| Normalized origin | Origin as resolved by the provider | TBD |
| Normalized destination | Destination as resolved by the provider | TBD |
| Route alternatives | Candidate routes to choose among | TBD |
| Transport modes | Walking, transit, driving, rideshare | TBD |
| Estimated durations | Per-route travel time | TBD |
| Reported disruptions | Delays or closures reported by the provider | TBD |
| Retrieval timestamp | When the estimate was fetched | TBD |
| Provider / status | Which provider, and live vs fixture | TBD |

An **exact event address is required** for accurate routing. It arrives as
`CalendarEvent.venueAddress`; the demo destination is Soothr, 204 E 13th St, New York, NY 10003
([`docs/decisions.md`](../../../docs/decisions.md) D8).

## Open questions

- Which transport modes matter for Columbia → Soothr, and in what priority order?
- Does the planner receive all alternatives and pick one, or does maps pick and return a
  single recommended duration?
- How stale may a retrieval be before it must be refetched?

## Consumers

- Backend planner feature (travel duration for the leave-by calculation).
- Backend assistant feature, via the `getCommute` tool.
- Frontend maps and overview modules.

## Change rule

Changing this contract requires notifying the other developer before merging. When
implementation has begun, the contract doc and all consumers are updated in the **same** pull
request. See [`docs/collaboration.md`](../../../docs/collaboration.md).
