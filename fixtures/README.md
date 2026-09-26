# Fixtures

**Status:** Scaffold only — directories exist, **no fixture data has been written**.

`AGENTS.md` Section 8 explicitly defers creating actual fixtures. These directories exist so
the strategy has a home and teammates know where fixtures will live.

## Why fixtures matter here

Two developers work concurrently, and provider access arrives at different times. Google
authorization, ElevenLabs access, and a finished Pico setup must **not block** other feature
work. Synthetic fixtures, or a documented mock-service boundary, are how a developer keeps
moving when another feature or provider is not ready.

## Layout

```text
fixtures/
├── weather/    # Synthetic forecast scenarios
├── calendar/   # Synthetic event scenarios (the demo dinner is synthetic until access exists)
├── maps/       # Synthetic route and duration scenarios
└── planner/    # Synthetic getting-ready scenarios, feasible and conflicting
```

## The labeling rule

Every fixture must be **visibly labeled as synthetic** wherever it surfaces. Never present a
fixture as a live condition.

- Never invent current weather, routes, or arrival estimates and pass them off as real.
- Example weather and travel times are fixtures, not live conditions, and the UI must say so.
- A fixture is for development and demo rehearsal, not for filling a gap when a provider
  fails. When a provider is unavailable, show the error state — do not silently substitute
  fixture data.

## Scenarios worth covering later

The demo may run **any time between 12 PM and 4 PM**, so planner fixtures should eventually
cover noon, 2 PM, 3:30 PM, and 4 PM — including at least one case where the tasks genuinely do
**not** fit, so the conflict path is exercised. See
[`docs/demo-scenario.md`](../docs/demo-scenario.md).

## Open questions

- File format and naming convention for a scenario.
- Whether fixtures are selected by an environment flag, a request parameter, or a mock service
  boundary.
- Who owns keeping fixtures in sync with contract changes.
