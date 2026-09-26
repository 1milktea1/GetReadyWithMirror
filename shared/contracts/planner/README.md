# Contract: Planner Input and Output

**Owner:** TBD
**Status:** Proposed in [`types.ts`](types.ts) — used by the backend planner and the overview, not yet agreed
**Producer:** [`backend/src/features/planner/`](../../../backend/src/features/planner/README.md)

[`types.ts`](types.ts) is the source of truth. Field names below match it.

## Input

The HTTP query and `generatePreparationPlan` carry:

| Field | Proposed name | Notes |
|---|---|---|
| Current time | `now` | ISO instant. Omit on the service to use the real clock |
| Event | chosen by the planner from the calendar fixture | Next event with a `venueAddress` |
| Route duration | `leaveBy.travelMinutes` on the way out; mode via `mode` | From the maps result |
| Arrival buffer | `buffer` / `arrivalBufferMinutes` | Default 10 |
| Tasks | `tasks` as `id:minutes` pairs | Default shower 15, hair 20, dressed 10 |

## Output: `PreparationPlan`

Returned as `{ ok: true, data }` even when the routine does not fit.

| Field | Purpose |
|---|---|
| `status` | `ok` or `schedule-conflict` |
| `leaveBy` | Departure instant, travel minutes, mode, buffer, and `arriveBy` |
| `startGettingReadyAt` | Ideal start so the routine ends at leave-by |
| `tasks[]` | Caller order, with `start` / `end`, `completed`, and `overruns` |
| `slackMinutes` | Free time before the routine; negative when it does not fit |
| `pressure` | `relaxed`, `comfortable`, `tight`, or `conflict` |
| `summary` | One sentence for the UI |
| `conflict` | `null`, or shortfall plus `adjustments` the user may accept |
| `provenance` | `calendar` and `maps` each `fixture` or `live`; `isFixture` if either is |

`schedule-conflict` is a legitimate plan, not an `{ ok: false }` error. `{ ok: false }` is
only `input-invalid` or `no-data`.

Adjustments (`shorten-task`, `set-buffer`, `set-mode`) describe a change. The planner does
not apply them, drop tasks, or edit the reservation.

## Resolved for the demo, still open for the team

- Tasks stay in the caller's order. Nothing is reordered.
- Default buffer is 10 minutes. Default mode is transit.
- Pressure cuts are 120 spare minutes (relaxed) and 30 (comfortable). Below 30 is tight.
- Suggestions will not shrink a task below 5 minutes.

## Consumers

All time arithmetic here is computed in **time-zone-aware code**, not produced by Grok
prose. Grok may explain a result; it may not calculate one.

## Change rule

Changing this contract updates this document, [`types.ts`](types.ts), and the consumers in the
same pull request.
