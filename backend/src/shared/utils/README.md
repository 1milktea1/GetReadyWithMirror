# Backend Shared: Utils

**Owner:** Integration owner (TBD)
**Status:** Not implemented

Future home of small, genuinely cross-feature helpers.

## Keep this directory small

Shared utilities are a common source of merge conflicts between two developers working
concurrently. Prefer keeping logic inside the feature that owns it. Something belongs here
only when **more than one** feature truly needs it.

Feature-specific logic does not belong here, even if it looks generic.

## Likely first resident: time handling

Time-zone-aware time arithmetic and the demo/test-time override are needed by the planner,
weather, and calendar features, so they are a plausible shared concern. Where that code
finally lives is TBD — the planner feature is the alternative home.

Whatever the location, deadlines and feasibility are computed deterministically in code, never
by Grok prose.

## Planned future files

TBD. Add helpers only when a second feature needs them.
