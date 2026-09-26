# Frontend Feature: Planner

**Owner:** TBD
**Status:** Not implemented

Renders the getting-ready timeline: task windows, the leave-by deadline, and progress through
the routine. This is the mirror's headline value, so the expanded view deserves the most
design attention.

Must render **schedule conflicts** clearly. When the tasks do not fit, the user sees the
conflict and the suggested adjustments — not a quietly compressed plan.

## Planned future files

Compact plan summary, expanded timeline view, conflict presentation, and controls for
adjusting a task duration or marking a task complete.

## Does NOT own

Time arithmetic. Task windows, deadlines, buffers, and feasibility are computed by the backend
planner feature in deterministic, time-zone-aware code.
