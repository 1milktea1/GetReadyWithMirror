# GetReadyWithMirror
agentic smart mirror that optimizes everyday life

---

**Status: early build.** The mirror UI runs with a working **calendar module** (New York clock,
date, and upcoming events from synthetic data) in the top-right corner. Other modules, the
backend, voice, and live data are not started.

Read [`AGENTS.md`](AGENTS.md) before changing anything.

## What this is

A voice-controlled, AI-powered smart mirror for a hackathon's **Live Better (strictly personal
utility)** track. It helps one person get ready for an upcoming event by combining their
calendar, the weather, preparation tasks, and a travel-derived **leave-by deadline** into a
single personalized plan.

The headline value is the **intelligent preparation planner**: Gemini connects weather and
event information to user-described tasks against a real deadline. Transportation supports
that experience rather than being the point of the project.

## Stack

Only the frontend is set up so far; the rest is planned.

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript (Vite), black-background mirror UI — **set up**, hosted on Vercel |
| Backend | Node.js + Express + TypeScript, on the laptop |
| AI controller | Gemini — intent interpretation, constrained tool selection, response wording |
| Voice | ElevenLabs Scribe for speech-to-text, ElevenLabs for text-to-speech |
| External data | Weather provider, Google Calendar (planned), Google Maps Routes (planned) |
| State | Local app state initially; no database yet |
| Event transport | Typed UI-event interface; WebSocket proposed, not decided |

## Physical setup

A laptop hosts the interface, backend, Gemini orchestration, and voice flow, and sends video
over HDMI to a monitor behind a two-way mirror. The laptop's **built-in microphone and
speakers** handle voice. A Raspberry Pi Pico is an **optional** USB-serial accessory for a
button or indicator; it does not host the app, and the core demo requires no additional
hardware.

## Repository layout

```text
├── AGENTS.md      # Project context and coding-agent instructions — read this first
├── frontend/      # React interface — calendar module implemented
├── vercel.json    # Vercel build settings for the frontend
├── backend/       # Express server, feature-first (planned)
├── shared/        # Cross-feature contracts
├── hardware/      # Optional Pico accessory
├── fixtures/      # Synthetic, visibly labeled demo scenarios
└── docs/          # Architecture, collaboration, contracts, demo, permissions, decisions
```

The project is a **feature-first monorepo**. Weather, calendar, maps, planner, and AI/voice
each stay independently workable: a feature owns its provider integration, logic, and
documented interface, and other features depend only on its public interface.

## Documentation

| Document | Purpose |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | Data flow, speech pipeline, integration boundaries |
| [`docs/collaboration.md`](docs/collaboration.md) | Ownership, branching, merge rules |
| [`docs/api-contracts.md`](docs/api-contracts.md) | Index to feature contracts and the event envelope |
| [`docs/demo-scenario.md`](docs/demo-scenario.md) | The Columbia to downtown 5 PM dinner flow |
| [`docs/permissions.md`](docs/permissions.md) | Tool allowlist and confirmation-required actions |
| [`docs/decisions.md`](docs/decisions.md) | Open decisions the team still owes |
