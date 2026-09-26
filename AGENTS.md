# GetReadyWithMirror — Project Context and Coding-Agent Instructions

> Read this document before changing the project. The assistant model is **Grok** (xAI Responses API, default `grok-4.7`), not Gemini. Weather and the assistant tool loop are implemented. Keep feature boundaries, keep secrets server-side, and do not add a database. Two developers build separate backend features concurrently, so modular ownership and stable integration boundaries still apply.

## 1. Project overview

Build a **voice-controlled, AI-powered smart mirror** for a hackathon's **Live Better (strictly personal utility)** track. The mirror helps one person get ready for an upcoming event by combining their calendar, the weather, preparation tasks, and a travel-derived **leave-by deadline** into one personalized plan. Transportation supports the getting-ready experience; it is not the project's main purpose.

**Physical setup**
- A laptop runs and hosts the React interface, backend, Grok orchestration, and voice flow.
- The laptop sends video over HDMI to a monitor mounted behind a two-way mirror.
- The laptop's **built-in microphone and speakers** are used for voice input/output. **Do not assume a JBL speaker or Raspberry Pi computer.**
- A **Raspberry Pi Pico**, if integrated, connects to the laptop via USB serial and handles optional physical input/output (e.g., an activation button or indicator). The Pico **does not host** the app.
- Avoid requiring any additional hardware for the core hackathon demo.

**Stack**
- Frontend: React + TypeScript (Vite), black-background, mirror-friendly UI.
- Backend: Node.js + Express + TypeScript, running on the laptop.
- AI controller: Grok via the xAI Responses API for intent interpretation, constrained tool/function selection, context-aware suggestions, and response wording. Default model `grok-4.7`. Key name: `XAI_API_KEY`, server-side only. Server-side web search stays off.
- Voice: ElevenLabs speech-to-text (Scribe) for input and ElevenLabs text-to-speech for spoken output through laptop speakers. Grok—not ElevenLabs Agents—is the central decision-maker.
- External data: weather provider, calendar provider (planned: Google Calendar), and maps/transit directions provider (planned: Google Maps Routes); finalize accounts, quotas, and exact endpoints later.
- State: local app state initially; SQLite may eventually store preferences, tasks, and planning history, but **do not add a database now**.
- Backend-to-frontend event transport: plan for a small, typed UI-event interface (WebSocket is the proposed option); defer the final choice to the integration discussion.

## 2. Hackathon demo: the shared product contract

The demonstration can occur **any time between 12 PM and 4 PM**. The fictional user is **at Columbia University** and has a **5 PM dinner reservation somewhere downtown**. Choose/set an exact sample restaurant address later; never invent current weather, routes, or arrival estimates and label demo fixtures clearly.

Expected flow:
1. Start a voice session via an on-screen push-to-talk control (optional Pico button later). The mirror greets the user with an appropriate **“Good afternoon”**, then **fades into a compact overview**: current/afternoon weather, the 5 PM calendar event, a short getting-ready plan, and a leave-by summary.
2. The user says, **“Expand weather and recommend what I should wear and bring.”** ElevenLabs transcribes; Grok interprets the request; the backend retrieves weather and event context. The React weather module expands and displays grounded clothing/essentials suggestions, while ElevenLabs speaks a concise response.
3. The user says **“Show my calendar”** or **“Go back.”** Grok chooses the correct interface action; the relevant module expands, or the overview returns.
4. The user asks **“When do I need to leave?”** The maps feature retrieves possible travel estimates from Columbia to the event address. A deterministic backend calculation combines event start, travel duration, and buffer into a leave-by time.
5. The user says **“Plan my time. I need to shower, do my hair, and get dressed.”** The planner uses task durations and the leave-by deadline to propose a getting-ready timeline.
6. The user adds a constraint, such as **“Actually, give me 20 more minutes for my hair.”** Grok identifies the update; the planner recalculates and explains any conflict. It must not silently remove tasks or change the calendar reservation.

The system must work with **relative current time** rather than a hardcoded 2:45 PM. Include a future **demo/test-time override** as a design requirement so developers can test noon, 2 PM, 3:30 PM, and 4 PM scenarios. If time is insufficient, show a clear conflict instead of inventing a feasible schedule. Any example weather or travel times must be labeled as fixtures, not live conditions.

## 3. Architectural rules and responsibility boundaries

Follow a **feature-first monorepo**. Weather, calendar, maps, planner, and AI/voice must remain independently workable. Each feature owns its provider integration, application logic, and documented interface; other features may only depend on its public interface, not its internals. The overview assembles results without duplicating provider logic.

| Feature | Owns | Does **not** own |
|---|---|---|
| Weather | Weather provider adapter; normalized forecast; forecast for event/getting-ready window | React navigation; calendar fetches; Grok calls |
| Calendar | Calendar provider adapter; upcoming event details and location; auth boundary | Route calculations; weather recommendations |
| Maps | Origin/destination routing adapter; candidate routes, travel durations, and provider freshness | Outfit suggestions; calendar editing; deciding the entire routine |
| Planner | Tasks, duration changes, preparation timeline, feasibility checks, leave-by calculation using supplied route/event data | Making external API requests directly; inventing facts |
| AI Assistant | Grok orchestration; permitted tool registry; conversation context; human-readable response; user-intent-to-UI actions | Directly editing React DOM; unrestricted code execution; duplicating other features' service logic |
| Voice | ElevenLabs speech-to-text / text-to-speech transport; session lifecycle and listening indicators | Independent assistant reasoning or its own competing tool-selection logic |
| Frontend | React modules, display state, transitions, microphone controls, voice status, event consumption | Secret API credentials; provider requests that bypass backend |
| Hardware (optional) | Pico USB-serial messaging and future physical controls | Hosting frontend/backend or being necessary for the voice demo |

**Important architectural constraints**
- Grok **requests** named tools; the backend **validates and executes** them. Only allowlisted tools may run. Never execute arbitrary model-generated code or accept unvalidated tool arguments.
- A spoken UI request such as `expandWidget(weather)` should produce a **typed UI event**; React owns the actual expansion/fade animation. The assistant should not generate JSX or manipulate browser elements directly.
- An action and an information request can happen in the same turn (e.g., expand weather while fetching a forecast). Return tool results to Grok before it makes factual spoken recommendations.
- Use shared normalized types and stable contracts for cross-feature interactions. Keep third-party API response shapes inside provider adapters.
- Time-zone-aware, deterministic logic—not Grok prose—must calculate task windows, event deadlines, travel buffers, and schedule feasibility.
- Updates that modify a real calendar event or overwrite a saved plan should require explicit user confirmation. Read-only demo functions may run without confirmation.
- Do not put Grok, ElevenLabs, maps, or calendar API keys into React bundles, Git, or documentation. Keep secrets server-side; plan an `.env.example` later with **names only**.
- The app should degrade cleanly when internet, provider access, microphone access, or one feature is unavailable. Reserve a documented demo-fixtures strategy so teammates can work in parallel.

## 4. Proposed repository layout

This is the **target organization**, not an instruction to create TypeScript implementations today. During scaffolding, create **directories and brief Markdown README placeholders only**. Use `.gitkeep` for intentionally empty directories if needed. Document future filenames in feature READMEs rather than generating blank `.ts`/`.tsx` modules just to fill the tree.

```text
GetReadyWithMirror/
├── AGENTS.md                       # This file: coding-agent project context
├── README.md                       # Short project overview and later setup instructions
├── frontend/
│   ├── README.md                   # Frontend ownership, planned UI structure
│   └── src/
│       ├── app/                    # Future app entry and screen composition
│       ├── features/
│       │   ├── overview/
│       │   ├── weather/
│       │   ├── calendar/
│       │   ├── maps/
│       │   ├── planner/
│       │   └── assistant/           # Voice UI and assistant status
│       └── shared/                 # Future presentation utilities/hooks
├── backend/
│   ├── README.md                   # Backend conventions and composition boundary
│   └── src/
│       ├── app/                    # Future single Express integration/composition point
│       ├── features/
│       │   ├── weather/
│       │   ├── calendar/
│       │   ├── maps/
│       │   ├── planner/
│       │   ├── assistant/           # Grok orchestration and UI action dispatch
│       │   └── voice/               # ElevenLabs input and output integration
│       └── shared/
│           ├── config/              # Future environment/config handling
│           ├── events/              # Future server-to-React event transport
│           ├── errors/              # Future shared error conventions
│           └── utils/
├── shared/
│   ├── README.md                    # Cross-feature contract ownership rules
│   └── contracts/
│       ├── weather/
│       ├── calendar/
│       ├── maps/
│       ├── planner/
│       ├── assistant/
│       └── events/                 # UI expansion/collapse events
├── hardware/
│   └── pico/                        # Optional future USB-serial firmware
├── fixtures/
│   ├── weather/
│   ├── calendar/
│   ├── maps/
│   └── planner/                     # Synthetic, visibly labeled demo scenarios
└── docs/
    ├── architecture.md             # Data flow and integrations
    ├── collaboration.md            # Ownership, branch and merge rules
    ├── api-contracts.md             # Index to feature contracts / event envelope
    └── demo-scenario.md            # Columbia → downtown, 5 PM dinner test flow
```

For every backend feature directory and its corresponding `shared/contracts/<feature>/` directory, create a **short README.md** describing: responsibility, planned public inputs and outputs, upstream dependencies, likely downstream consumers, error states, and the assigned developer (use `TBD` until assigned). Also create brief READMEs for frontend feature folders if that helps teammates claim ownership. No working source files yet.

Suggested **future** internals for each backend feature: its own route/controller (if exposed over HTTP), service logic, provider adapter (when applicable), and feature-local tests. These are conventions for future work, **not** files to implement during scaffolding. The assistant feature will eventually own Grok tool declarations/dispatch; it should call the other features' public services instead of importing provider adapters.

## 5. Shared contracts to agree on before implementation

Create documentation placeholders identifying these interfaces; **do not write TypeScript interfaces, routes, fixtures, or handlers yet**. Other developers should be able to read the contract docs and independently implement a feature once the team approves them.

- **Weather result:** location, forecast timestamp/time zone, current conditions, hourly outlook across the event window, precipitation/temperature summary, provenance/status.
- **Calendar event:** ID, title, start/end with time zone, venue name/address (if provided), provenance/status. Demo event is synthetic until calendar access is configured.
- **Maps result:** normalized origin/destination, route alternatives, transport modes, estimated durations and any reported disruptions, retrieval timestamp, provider/status. Exact event address required for accurate routing.
- **Planner input/output:** current (or overridden demo) time, event time, venue, route duration, preferred arrival buffer, named preparation tasks and durations; output is a feasible schedule or explicit conflict with suggested adjustments.
- **Agent tools:** `expandWidget`, `collapseWidget`, `showOverview`, `getWeather`, `getUpcomingEvent`, `getCommute`, `generatePreparationPlan`, `updateTaskDuration`, `markTaskComplete`, and optionally `getPreferences`. Confirm argument/result shapes jointly before coding.
- **UI event envelope:** action name, target widget where relevant, request/correlation ID, optional payload, and timestamp. Support expansion and overview return. Decide one backend-to-frontend transport before implementing it.
- **Error conventions:** predictable not-authorized/not-configured, no-data, external-provider-unavailable, input-invalid, and schedule-conflict responses. Expose useful UI fallback states; never substitute fabricated live data.

A likely eventual API layout is `/api/weather`, `/api/calendar`, `/api/maps`, `/api/planner`, and `/api/assistant`, plus a health endpoint. Treat these as **namespaces to discuss**, not instructions to create endpoints today. Voice may be handled via a dedicated backend namespace or integrated session endpoints; document the eventual decision.

## 6. Collaboration: two backend developers working concurrently

The structure should **prevent frequent editing of the same files**. Agree on ownership before implementation, and use feature branches / short pull requests so each developer can work simultaneously without repeatedly merging the same central file.

- Each feature has a clear owner; the owner changes only files within that feature and its corresponding contract documentation by default. Record ownership in `docs/collaboration.md`.
- Split work by **feature**, not by both developers editing one shared route file. One possible split is Developer A: weather + calendar; Developer B: maps + Grok assistant, with planner scoped jointly after contracts are agreed. Rebalance as needed; this is **not** a forced assignment.
- Plan the planner as its **own feature** even if one developer initially owns it. It must consume normalized outputs from weather/calendar/maps, not import their internal provider implementations.
- The app/bootstrap and shared event transport are **integration-owned files**; choose one integration owner. Other developers request changes to these central files or coordinate a brief integration session.
- Agree on contract shapes and fixture scenarios first. If changing a shared contract, communicate before merging and update the corresponding contract documentation and consumers in the same PR when implementation begins.
- Keep feature-specific docs and future tests beside each feature. Avoid unrelated formatting refactors or package/dependency changes in feature branches.
- Merge small changes frequently and rebase/pull before editing integration boundaries. Never assume simultaneous local files automatically sync between two laptops; Git is the source of truth.
- Use synthetic fixtures or documented mock-service boundaries when another feature is not ready. Do not block all feature work on Google authorization, ElevenLabs access, or a finished Pico setup.

**Proposed branch pattern:** `feature/weather`, `feature/calendar`, `feature/maps`, `feature/planner`, `feature/assistant`, and `integration/...`. The exact naming is optional, but ownership and non-overlapping changes are not.

## 7. Voice and UI behavior requirements

The frontend starts with a **greeting screen** and fades into a compact overview. Voice commands can **expand a module** into a focused view; a “go back”/“show overview” command restores the compact view. Visible microphone/listening and loading/error states are necessary. The user should be able to retry or use basic on-screen controls if voice recognition fails.

Proposed logical speech pipeline: laptop microphone → ElevenLabs transcription → Express → Grok tool selection → validated backend tool execution → (a) UI event to React and (b) tool results back to Grok → ElevenLabs TTS → laptop speakers. Commands can trigger both UI navigation and information retrieval in one request. The React UI should not rely on string matching spoken phrases; Grok controls intent selection through a bounded tool list.

The **smart mirror's main value** is the intelligent preparation planner: Grok connects weather/event information and user-described tasks to a real deadline. The weather module's outfit/packing suggestions must be based on the fetched forecast and event context. Maps provides the leave-by input but must not dominate the Live Better pitch.

## 8. Initial scaffold

The layout below is already in the repo. Weather and the Grok assistant were added later, when someone asked for them. Do not treat this checklist as a ban on that work, and do not repeat the scaffold over existing files.

When asked to initialize an empty checkout, **do only the following**:

1. Inspect the current workspace and preserve any existing files. If a repo already exists, propose a non-destructive mapping rather than replacing it silently.
2. Create the directory layout in Section 4 (adapt root folder name to the actual VS Code workspace). Preserve this `AGENTS.md` at the workspace root.
3. Create the Markdown placeholders described above: root/area READMEs, short per-feature responsibility READMEs, and the four `docs/` files with headings and `TBD` sections. Include the shared demo scenario and proposed collaboration rules in their appropriate docs.
4. Add `.gitkeep` only where an otherwise empty directory would not be tracked.
5. Finish with a **tree of directories and placeholder docs created**, plus any decisions the two developers must settle before implementation (ownership, contract types, provider/API choices, event transport).

**On that initialization pass, do not:** generate application logic; create React components, Express endpoints, assistant tools or prompts, ElevenLabs integration, Pico firmware, actual fixtures, tests, CI, `.env` secrets, installed dependencies, `package.json` boilerplate, Docker files, or an application that pretends to work. Do not run install commands or make external API calls. Do not overwrite existing work.
