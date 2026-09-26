# Open Decisions

Running list of choices [`AGENTS.md`](../AGENTS.md) deliberately defers. Settle these before or
during early implementation so they are not re-litigated later.

Record the outcome here when a decision is made, with the date and who agreed.

## Blocking implementation

These gate real work and should be settled first.

### D1. Feature ownership

Who owns weather, calendar, maps, planner, assistant, and voice — and who is the **single
integration owner** for `backend/src/app/` and `backend/src/shared/events/`.

One possible split: Developer A takes weather + calendar, Developer B takes maps + assistant,
planner scoped jointly. Not a forced assignment.

**Status:** Open. Record in [`collaboration.md`](collaboration.md).

### D2. Contract shapes

The six contracts in [`shared/contracts/`](../shared/README.md) are proposed, not agreed. Each
needs its field list confirmed before anyone implements against it.

**Status:** Open. See [`api-contracts.md`](api-contracts.md).

### D3. Backend-to-frontend event transport

WebSocket is proposed. Server-sent events are the obvious alternative. **One choice, made
once, before implementation.**

Considerations: the mirror is single-user on one laptop, and whether UI events and tool results
share a channel is itself undecided.

**Status:** Open. Deferred to the integration discussion.

### D4. Agent tool argument and result shapes

The ten tools are named; their signatures are not. Confirm **jointly** — the assistant owner
cannot decide these alone, since other features execute them.

**Status:** Proposed shapes are implemented in [`shared/contracts/assistant/`](../shared/contracts/assistant/README.md) as of 2026-09-26. Not agreed. Confirm jointly before other features depend on them.

## Providers and accounts

### D5. Weather provider

Which provider, which account, what quota. Units (imperial, metric, or both) also unresolved;
the demo is in New York City.

**Status:** Decided 2026-09-26 by carolynl950 (weather owner). Open-Meteo, no API key or
account. Imperial by default with a metric option. Location hardcoded to Columbia University
by default, changeable by search. See
[`shared/contracts/weather/`](../shared/contracts/weather/README.md).

### D6. Google Calendar access

Account, OAuth scopes, quotas, and exact endpoints. The demo event is **synthetic** until this
is configured — and configuring it must not block other work.

**Status:** Open.

### D7. Google Maps Routes access

Account, quotas, exact endpoints, and which transport modes matter for Columbia → Soothr
(204 E 13th St), roughly 6 miles down Manhattan.

**Status:** Open for the account and quota. The demo can run without a key. When
`GOOGLE_MAPS_API_KEY` is set, the backend calls the Directions API for transit, driving,
walking, and cycling, and driving can include traffic. A key is optional — the demo already
has live subway times without one. Campus pins start Transitous at the 116 St–Columbia
University 1 train so the trip is ~33 minutes (the time Google/Apple show), not a 21-minute
walk to the 2/3. Walking and driving use Valhalla, and anything still missing stays on the
labeled fixture
([`fixtures/maps/columbia-to-soothr.json`](../fixtures/maps/columbia-to-soothr.json)): transit
35 minutes, plus cycling 28, driving 30, and walking 105. Rideshare copies driving. The same
key name works as a Vercel project env var for preview/production functions. See
[`backend/src/features/maps/README.md`](../backend/src/features/maps/README.md) and
[`api/README.md`](../api/README.md).

### D8. The exact demo restaurant address

Accurate routing needs a real downtown address.

**Status:** Decided 2026-09-26. **Soothr, 204 E 13th St, New York, NY 10003** (East Village) is
the 7 PM reservation venue. It is in
[`fixtures/calendar/demo-day.json`](../fixtures/calendar/demo-day.json) as the dinner event's
`venueName` and `venueAddress`, so maps can route Columbia → Soothr. The **address is real; the
reservation is not** — the event stays synthetic until Google Calendar is connected.

### D17. Assistant model

Grok via the xAI Responses API replaces Gemini as the decision-maker. Default model `grok-4.7`.
Optional override `XAI_MODEL`. Key `XAI_API_KEY`, server-side only. The adapter turns server-side
web search off so facts come from allowlisted tools.

**Status:** Decided 2026-09-26 on `feature/agent`.

## Design and scope

### D9. Demo/test-time override mechanism

A required design feature so noon, 2 PM, 3:30 PM, and 4 PM are all testable. Undecided: whether
it is an environment variable, a request parameter, or a UI control, and what it is named.

Every feature that reads the clock must read it through this override.

**Status:** The mirror UI always uses the device clock. It does not honor `?now=` and does
not show a demo-time label. Backend APIs still accept `?now=` so tests and local rehearsal
can pin a clock without shifting the display. See
[`frontend/src/shared/time/nowOverride.ts`](../frontend/src/shared/time/nowOverride.ts).

### D10. Voice API placement

A dedicated backend namespace, or integrated session endpoints. Document whichever is chosen.

**Status:** Open.

### D11. Where time utilities live

`backend/src/shared/utils/` or the planner feature. Weather, calendar, and planner all need
time-zone-aware arithmetic, which argues for shared — but shared code is also the most common
merge-conflict source between two concurrent developers.

**Status:** Display time stays in [`frontend/src/shared/time/`](../frontend/src/shared/time/).
Wall-clock conversion that both the calendar fixture and the planner need lives in
[`backend/src/shared/utils/zonedTime.ts`](../backend/src/shared/utils/zonedTime.ts). Leave-by
and feasibility stay in the planner. Not a final ruling on every future helper.

### D12. Confirmation mechanism

How the user confirms a calendar change or a plan overwrite: spoken, on-screen, or both. Also
whether a saved plan exists at all before SQLite is introduced.

**Status:** Open. See [`permissions.md`](permissions.md).

### D13. Fixture format and selection

File format, naming convention, and how a fixture is selected — environment flag, request
parameter, or a mock-service boundary. Also who keeps fixtures in sync with contract changes.

**Status:** Partly settled by example. The calendar fixture is JSON with wall-clock times
relative to the current day, placed onto real instants at runtime so it never goes stale, and
is selected in code by passing a fixture-backed `CalendarSource`. Worth adopting for the other
fixtures unless someone objects. Sync ownership still open. See
[`fixtures/`](../fixtures/README.md).

### D14. SQLite

Explicitly **not** part of current scope. If preferences, tasks, and planning history need to
persist, decide when it enters and what it owns.

**Status:** Open, deliberately deferred.

### D15. Raspberry Pi Pico

Part of the demo, or a stretch goal? If included: the serial message format, and which
laptop-side component owns the connection.

The core demo must work without it either way.

**Status:** Open.

### D16. UI hosting and preview pipeline

Vercel hosts the frontend so every push gets a preview URL teammates can open without running
anything locally. [`vercel.json`](../vercel.json) is committed; deploys run lint and the full
test suite before building, and skip pushes with no UI changes since the last successful deploy.

This hosts the **UI only**. The Express backend is planned to run on the laptop, so once modules
depend on `/api/*`, the Vercel preview will need either the fixture sources or a reachable
backend URL. Decide which before the first live-data module lands.

**Status:** Configured; waiting for someone with Vercel access to import the repository. See
[`frontend/README.md`](../frontend/README.md#deploying-to-vercel).

## Decided

Move entries here with the date and who agreed.

- **D5. Weather provider** — Open-Meteo; imperial and Columbia by default, both changeable.
  2026-09-26, carolynl950.
- **D8. Demo restaurant address** — Soothr, 204 E 13th St, New York, NY 10003. 2026-09-26.
- **D17. Assistant model** — Grok via the xAI Responses API, not Gemini. Default model
  `grok-4.7` (`XAI_MODEL` overrides). Key name `XAI_API_KEY`, server-side only. Server-side
  web search is off; only the allowlisted tools run. 2026-09-26, on `feature/agent`.
