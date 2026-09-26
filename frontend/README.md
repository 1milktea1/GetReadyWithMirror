# Frontend

**Status:** Scaffold only — no components, no dependencies, no build setup.

Planned stack: React + TypeScript (Vite), with a black-background, mirror-friendly UI. Nothing
is installed yet; see [`AGENTS.md`](../AGENTS.md) Section 8.

## Layout

```text
frontend/src/
├── app/          # App entry and screen composition (integration-owned)
├── features/
│   ├── overview/   # Compact default view, assembles the other modules
│   ├── weather/    # Weather module and clothing/packing display
│   ├── calendar/   # Upcoming event module
│   ├── maps/       # Travel options and leave-by summary
│   ├── planner/    # Getting-ready timeline and conflicts
│   └── assistant/  # Push-to-talk, microphone and listening status
└── shared/       # Cross-module presentation utilities and hooks
```

## Display behavior

The mirror opens on a **greeting screen** with a time-appropriate salutation, then **fades
into a compact overview** showing current and afternoon weather, the upcoming event, a short
getting-ready plan, and a leave-by summary.

A voice command **expands one module** into a focused view. "Go back" or "show overview"
restores the compact view. Visible microphone, listening, loading, and error states are
required, and the user must be able to retry or use basic on-screen controls when voice
recognition fails.

## The rule that shapes this whole layer

**React does not decide intent.** The UI must not string match spoken phrases. Gemini selects
intent through a bounded tool list, the backend validates and executes, and React receives a
**typed UI event**. React owns the actual expansion and fade animation; the assistant never
generates JSX or manipulates browser elements.

## Ownership

Frontend feature modules render state. They do not own provider requests, API credentials, or
the logic that belongs to a backend feature. Time arithmetic in particular is computed on the
backend, not here.

[`src/app/`](src/app/README.md) and [`src/shared/`](src/shared/README.md) are
integration-owned; coordinate before restructuring them.

## Design notes

The display sits behind a two-way mirror. Assume a black background, high contrast, and type
readable at a distance — unlit pixels are what make the mirror effect work.

Any weather or travel figure shown during the demo must be either genuinely retrieved or
**visibly labeled as a fixture**.
