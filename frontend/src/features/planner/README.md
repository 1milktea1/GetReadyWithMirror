# Frontend Feature: Planner

**Owner:** TBD
**Status:** Overview tile implemented. It renders `GET /api/planner` and does not compute leave-by.

The compact tile sits on the left under weather and shows the leave-by time and each task
window. The same leave-by stays in a reminder card under that plan. Click to expand
conflict adjustments, mark a task done, or give hair
20 more minutes. Those controls call the backend again; they do not edit the schedule in the
browser. The overview's transportation choice is sent as `mode`. A fixture duration shows
`Sample route — not live`.

Must render **schedule conflicts** clearly. When the tasks do not fit, the user sees the
conflict and the suggested adjustments — not a quietly compressed plan.

## Planned future files

Compact plan summary, expanded timeline view, conflict presentation, and controls for
adjusting a task duration or marking a task complete.

## Does NOT own

Time arithmetic. Task windows, deadlines, buffers, and feasibility are computed by the backend
planner feature in deterministic, time-zone-aware code.
