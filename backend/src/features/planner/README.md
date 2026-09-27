# Backend Feature: Planner

**Owner:** TBD
**Status:** Working against calendar and maps fixtures — contract proposed, awaiting consumer sign-off
**Contract:** [`shared/contracts/planner/`](../../../../shared/contracts/planner/README.md)

## Responsibility

Owns preparation tasks, duration changes, the getting-ready timeline, feasibility checks, and
the leave-by calculation derived from supplied route and event data.

All scheduling math is deterministic and time-zone aware. Gemini may explain a result later;
it does not compute one. This feature makes no external API requests. It calls the calendar
and maps **public** services and never their adapters.

All scheduling logic must be **deterministic and time-zone aware**. Task windows, event
deadlines, travel buffers, and feasibility are computed in code, never by Grok prose.

These answer the open questions in [`docs/demo-scenario.md`](../../../../docs/demo-scenario.md)
for the demo. They are rehearsal choices, not a closed team decision.

| Choice | Value | Why |
|---|---|---|
| Transport | `transit` | The demo user is at Columbia; a car is not assumed |
| Travel time | Selected mode's duration from maps | Fixture subway is 35 min, so leave-by is 6:15 PM. A live duration moves leave-by. |
| Arrival buffer | 10 min | Arrive at 6:50 rather than walking in at 7:00 |
| Tasks, in order | Shower 15, hair 20, get dressed 10 | 45 minutes, so the routine must start at 5:30 PM |

With those numbers the demo clock lands on the scenario matrix:

| Now (New York) | Result |
|---|---|
| 12:00 PM | Relaxed. Routine still starts at 5:30 PM |
| 4:00 PM | Comfortable |
| 5:30 PM | Tight. Start now; the routine ends exactly at leave-by |
| 6:00 PM | Conflict. 30 minutes short. Tasks stay on the plan |
| After 8:30 PM | The 7 PM dinner has ended, so leave-by uses the 10:30 PM Soothr dinner |
| After midnight | Tomorrow: 10 AM Equinox East 92nd Street, 1:30 PM lunch at Soothr, 5 PM dinner at Soothr |
| 5:30 PM, hair 40 | Conflict. 20 minutes short. Shortening hair back to 20 resolves it |

Slack is free minutes before the routine. 120 or more is relaxed, 30 or more is comfortable,
zero or more is tight, and anything negative is a conflict. A conflict is a successful
response (`status: "schedule-conflict"`, HTTP 200). The planner does not drop, shorten, or
reorder tasks to hide it, and it does not move the reservation.

Task order is the caller's. The default order is shower, then hair, then dressed.

## Public inputs

`generatePreparationPlan({ now?, mode?, arrivalBufferMinutes?, tasks? })`

- `now` — real clock, or the demo override. The HTTP API reads `?now=`.
- `mode` — `transit` (default), `driving`, `walking`, or `cycling`.
- `arrivalBufferMinutes` — default 10.
- `tasks` — replaces the default routine. `updateTaskDuration` and `markTaskComplete` return a
  new list of the same length; pass that list back in.

## Public outputs

A `PreparationPlan` ([types](../../../../shared/contracts/planner/types.ts)): leave-by, per-task
windows, pressure, and either `conflict: null` or a shortfall plus adjustments the user may
accept. Adjustments are never applied automatically.

Feasible plans are scheduled just-in-time so the last task ends at leave-by. Conflicts are
scheduled forward from now so the timeline shows the overrun.

## Upstream dependencies

- Calendar fixture service: the next event that has not ended and has a `venueAddress`. On the
  demo day that is the 7 PM dinner at Soothr.
- Maps fixture service: travel minutes for that address. Any other destination is `no-data`;
  this feature will not guess a duration.

## Downstream consumers

- The overview, via `GET /api/planner`.
- A future assistant, via `generatePreparationPlan`, `updateTaskDuration`, and `markTaskComplete`.

## Error states

- `input-invalid` — bad clock, buffer, mode, or task list (HTTP 400).
- `no-data` — no upcoming address, or no fixture route (HTTP 404).
- `schedule-conflict` — tasks do not fit. This is the plan itself, not an error envelope.

## HTTP

`GET /api/planner`

| Query | Meaning |
|---|---|
| `now` | ISO 8601 demo clock |
| `mode` | Transport mode |
| `buffer` | Arrival buffer in minutes |
| `tasks` | `shower:15,hair:40,dressed:10` replaces the default routine |
| `done` | Comma-separated task ids to mark complete |

## Files

| File | Role |
|---|---|
| `plannerService.ts` | Public `generatePreparationPlan`. |
| `schedule.ts` | Leave-by, timeline, pressure, and conflict adjustments. |
| `tasks.ts` | `updateTaskDuration` and `markTaskComplete`. |
| `defaults.ts` | Buffer, mode, task durations, and slack thresholds. |
| `plannerHttp.ts` | `GET /api/planner`. |
| `planner.test.ts` | Scenario matrix, conflict behavior, and HTTP validation. |

Mounted by [`backend/src/app/createApp.ts`](../../app/createApp.ts). From `backend/`:

```bash
npm test
npm run dev    # http://localhost:3001/api/planner?now=2026-09-26T16:00:00-04:00
```

Try `now` at `12:00`, `14:00`, `15:30`, and `16:00` on a New York afternoon (`-04:00` during
daylight time, `-05:00` in winter). Add `&tasks=shower:15,hair:40,dressed:10` for the extra
hair conflict.

## Does NOT own

- Live maps or calendar requests.
- Gemini, voice, or widget animation.
