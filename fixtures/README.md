# Fixtures

**Status:** Calendar, maps, and planner fixtures written. Weather fixtures not started.

## Calendar: `calendar/demo-day.json`

A synthetic agenda used by the frontend calendar module until Google Calendar is connected.
Events are **wall-clock times in `America/New_York`, relative to the current day**:

```json
{ "id": "fixture-dinner", "title": "Dinner reservation",
  "dayOffset": 0, "startTime": "17:00", "durationMinutes": 90,
  "venueName": "Soothr", "venueAddress": "204 E 13th St, New York, NY 10003" }
```

`dayOffset` 0 is today, 1 is tomorrow. At runtime these are placed onto real instants around
the current (or `?now=`-overridden) New York time, so the sample day **never goes stale** and the
5 PM dinner from the demo scenario is always "today".

The venue address is **real** — maps needs a routable destination to produce genuine travel
estimates — but the reservation is synthetic, like every other event in this file.

This relative format suits any fixture whose meaning depends on time of day, and is a
candidate convention for the others — see [`docs/decisions.md`](../docs/decisions.md) D13.

## Why fixtures matter here

Two developers work concurrently, and provider access arrives at different times. Google
authorization, ElevenLabs access, and a finished Pico setup must **not block** other feature
work. Synthetic fixtures, or a documented mock-service boundary, are how a developer keeps
moving when another feature or provider is not ready.

## Layout

```text
fixtures/
├── weather/    # Synthetic forecast scenarios
├── calendar/   # demo-day.json — synthetic agenda including the 5 PM dinner at Soothr
├── maps/       # columbia-to-soothr.json — rehearsal durations and pin coordinates; live routers fill modes they can
└── planner/    # demo-scenarios.json — noon, 2 PM, 3:30 PM, 4 PM, and a hair conflict
```

## The labeling rule

Every fixture must be **visibly labeled as synthetic** wherever it surfaces. Never present a
fixture as a live condition.

- Never invent current weather, routes, or arrival estimates and pass them off as real.
- Example weather and travel times are fixtures, not live conditions, and the UI must say so.
- A fixture is for development and demo rehearsal, not for filling a gap when a provider
  fails. When a provider is unavailable, show the error state — do not silently substitute
  fixture data.

## Maps: `maps/columbia-to-soothr.json`

Rehearsal durations for Columbia University → Soothr. Transit is 35 minutes. The file says
it is synthetic; the API sets `provenance.isFixture`. It is not a live or measured route.
Any other address returns `no-data` instead of a guessed duration.

## Planner: `planner/demo-scenarios.json`

The same 5 PM dinner against the maps fixture and the default 45-minute routine:

| Demo time | Expected pressure |
|---|---|
| 12:00 PM | relaxed |
| 2:00 PM | comfortable |
| 3:30 PM | tight |
| 4:00 PM | conflict (30 minutes short) |
| 3:30 PM with hair at 40 minutes | conflict (20 minutes short) |

Backend planner tests read this file. See [`docs/demo-scenario.md`](../docs/demo-scenario.md).

## Open questions

- File format and naming convention for a scenario.
- Whether fixtures are selected by an environment flag, a request parameter, or a mock service
  boundary.
- Who owns keeping fixtures in sync with contract changes.
