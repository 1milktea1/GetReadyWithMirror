# Backend Feature: Maps

**Owner:** TBD
**Status:** Not implemented — contract not yet agreed
**Contract:** [`shared/contracts/maps/`](../../../../shared/contracts/maps/README.md)

## Responsibility

Owns the origin/destination routing adapter and produces candidate routes, travel durations,
and provider freshness information. This feature supplies the travel-duration input that the
planner turns into a leave-by deadline.

Maps supports the getting-ready experience. It is not the project's headline value and must
not dominate the Live Better pitch.

## Planned public inputs

- Normalized origin (the demo user is at Columbia University).
- Normalized destination (the event venue address; the exact sample restaurant address is TBD).
- Departure time or arrival target.
- Transport modes to consider.

## Planned public outputs

A normalized maps result. Exact field names are TBD:

- Normalized origin and destination as resolved by the provider.
- Route alternatives.
- Transport modes.
- Estimated durations, plus any reported disruptions.
- Retrieval timestamp.
- Provider and status.

Travel estimates must come from a real retrieval or a clearly labeled fixture. Never invent
arrival estimates.

## Upstream dependencies

- A maps/directions provider. Google Maps Routes is planned; account, quotas, and exact
  endpoints are TBD — see [`docs/decisions.md`](../../../../docs/decisions.md).
- The event venue address from the calendar feature's public interface. An exact address is
  required for accurate routing.

## Downstream consumers

- The planner feature, which combines travel duration with event start and buffer.
- The assistant feature, via the `getCommute` tool.
- The frontend overview and maps modules.

## Error states

- `not-configured` — no provider credentials present.
- `external-provider-unavailable` — provider unreachable, rate limited, or erroring.
- `no-data` — no route found between origin and destination.
- `input-invalid` — missing or unresolvable address.

When routing is unavailable the planner must surface that the leave-by time is unknown rather
than guessing a duration.

## Planned future files

- A route or controller, if exposed over HTTP at `/api/maps`.
- Service logic for selecting among route alternatives.
- A provider adapter isolating the directions API.
- Feature-local tests.

## Does NOT own

- Outfit suggestions.
- Calendar editing.
- Deciding the entire getting-ready routine.
