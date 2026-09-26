# Backend

**Status:** Express app mounts weather, maps, and the planner. Maps and the planner run from
fixtures. Voice, Gemini, and live Google APIs are not connected.

Stack: Node.js + Express + TypeScript, running on the laptop. Requires Node 23.6+ (the
runtime strips TypeScript; there is no compile step).

## Running

```bash
cd backend
npm install
npm test          # offline; the suite forces TZ=Asia/Tokyo
npm run dev       # http://localhost:3001 — /health, /api/weather, /api/maps, /api/planner
```

The frontend dev server proxies `/api` to port 3001. Rehearse the dinner demo with
`/api/planner?now=2026-09-26T16:00:00-04:00` (4 PM New York during daylight time). `12:00`,
`14:00`, and `15:30` are the other clocks in [`docs/demo-scenario.md`](../docs/demo-scenario.md).

## Layout

```text
backend/src/
├── app/          # Single Express integration/composition point (integration-owned)
├── features/
│   ├── weather/    # Weather provider adapter and normalized forecast
│   ├── calendar/   # Calendar provider adapter, upcoming event, auth boundary
│   ├── maps/       # Routing adapter, travel durations, freshness
│   ├── planner/    # Tasks, timeline, feasibility, leave-by calculation
│   ├── assistant/  # Gemini orchestration and UI action dispatch
│   └── voice/      # ElevenLabs speech-to-text and text-to-speech
└── shared/
    ├── config/     # Environment and config handling
    ├── events/     # Server-to-React event transport (integration-owned)
    ├── errors/     # Shared error conventions
    └── utils/      # Genuinely cross-feature helpers only
```

Each feature directory has a README describing its responsibility, planned inputs and outputs,
dependencies, consumers, error states, and owner.

## Conventions

**Feature-first.** Each feature owns its provider integration, application logic, and
documented interface. Other features depend only on its **public interface**, never its
internals. Third-party response shapes stay inside provider adapters.

**Suggested internals for a feature** (conventions for future work, not files to create now):
a route or controller if exposed over HTTP, service logic, a provider adapter where
applicable, and feature-local tests.

**Secrets stay server-side.** No Gemini, ElevenLabs, maps, or calendar key goes into a React
bundle, into Git, or into documentation. The frontend never calls a provider directly.

**Deterministic time.** Task windows, event deadlines, travel buffers, and feasibility are
computed in time-zone-aware code — never by Gemini prose. Read "now" through the
demo/test-time override rather than the system clock.

**Degrade cleanly.** A missing credential, an unreachable provider, a denied microphone, or
one broken feature must not take down the demo. Return a documented error state with a useful
UI fallback, and never substitute fabricated live data.

## Integration boundary

[`src/app/`](src/app/README.md) and [`src/shared/events/`](src/shared/events/README.md) are
**integration-owned**. One person owns them; everyone else requests changes or coordinates a
brief integration session. This is what keeps two developers from repeatedly merging the same
central file.

## Likely future API namespaces

`/health`, `/api/weather`, `/api/maps`, and `/api/planner` are mounted in
[`src/app/createApp.ts`](src/app/createApp.ts). `/api/calendar` and `/api/assistant` are still
namespaces to discuss. Voice transport placement is undecided.
