# Backend Feature: Planner

**Owner:** TBD (scoped jointly after contracts are agreed)
**Status:** Not implemented — contract not yet agreed
**Contract:** [`shared/contracts/planner/`](../../../../shared/contracts/planner/README.md)

## Responsibility

Owns preparation tasks, duration changes, the getting-ready timeline, feasibility checks, and
the leave-by calculation derived from supplied route and event data.

This is the smart mirror's **main value**: connecting weather and event information to
user-described tasks against a real deadline.

All scheduling logic must be **deterministic and time-zone aware**. Task windows, event
deadlines, travel buffers, and feasibility are computed in code, never by Grok prose.

Planner is its own feature even though one developer may initially own it. It consumes the
**normalized outputs** of weather, calendar, and maps. It must not import their provider
adapters.

## Planned public inputs

- Current time, or the overridden demo time.
- Event start time and venue.
- Route duration, supplied by the maps feature.
- Preferred arrival buffer.
- Named preparation tasks and their durations (for example shower, hair, get dressed).

## Planned public outputs

Either a feasible schedule or an explicit conflict:

- A feasible getting-ready timeline with per-task windows and a leave-by time, **or**
- An explicit schedule conflict with suggested adjustments.

If there is not enough time, show the conflict. Never invent a feasible schedule by
compressing or dropping work silently.

## Upstream dependencies

- Calendar feature public interface: event start and venue.
- Maps feature public interface: travel duration.
- Weather feature public interface: conditions that may affect preparation.

This feature makes **no external API requests of its own**.

## Downstream consumers

- The assistant feature, via the `generatePreparationPlan`, `updateTaskDuration`, and
  `markTaskComplete` tools.
- The frontend planner and overview modules.

## Error states

- `input-invalid` — missing event time, missing durations, or a negative buffer.
- `no-data` — a required upstream input (route duration or event) is unavailable, so a
  leave-by time cannot be computed.
- `schedule-conflict` — the requested tasks do not fit before the leave-by deadline. This is a
  legitimate, expected result and must be presented clearly, not smoothed over.

## Planned future files

- A route or controller, if exposed over HTTP at `/api/planner`.
- Service logic for timeline construction and feasibility checks.
- Deterministic time arithmetic utilities, time-zone aware.
- Feature-local tests covering noon, 2 PM, 3:30 PM, and 4 PM scenarios.

## Does NOT own

- Making external API requests directly.
- Inventing facts.

## Note on writes

Overwriting a saved plan is a **confirmation-required** action. Recalculating in response to a
user constraint such as "give me 20 more minutes for my hair" must not silently remove tasks
or change the calendar reservation. See
[`docs/permissions.md`](../../../../docs/permissions.md).
