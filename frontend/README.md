# Frontend

**Status:** Calendar (fixture), weather, and the getting-ready planner. The planner needs the
backend on port 3001 (`npm run dev` from `backend/`). Maps durations shown there are fixtures.

React 19 + TypeScript on Vite, with a black-background, mirror-friendly UI.

## Running it

Requires Node.js 20 or newer.

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Weather and the getting-ready plan call `/api`. Locally Vite proxies that to
`http://localhost:3001`. Start the backend first (`npm run dev` from `backend/`). On Vercel,
`/api/planner` and `/api/maps` are serverless functions that call the same handlers. If those
routes are missing, the planner falls back to the labeled Columbia → Soothr fixture so leave-by
still shows.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Re-run tests on change |
| `npm run lint` | oxlint; warnings count as failures |
| `npm run build` | Typecheck and production build into `dist/` |
| `npm run verify` | Lint, test, then build — exactly what Vercel runs |

Tests deliberately run in the `Asia/Tokyo` time zone, so code that accidentally uses the
machine's local zone instead of New York fails rather than passing on a New York laptop.

The mirror always shows the device's real clock in New York time, including on the expanded
map. It does not honor `?now=`.

## Deploying to Vercel

The repository imports with **no settings changes** — [`vercel.json`](../vercel.json) at the
repo root supplies install, build, and output settings.

1. In Vercel, choose **Add New → Project** and import `1milktea1/GetReadyWithMirror`.
2. Leave **Root Directory** as the repository root. Do not point it at `frontend/`: the root
   `vercel.json` would then be ignored and tests would not run before deploys.
3. Click **Deploy**. No environment variables are required. Optional, server-side only:

| Name | Effect |
|---|---|
| `GOOGLE_MAPS_API_KEY` | Google Directions instead of Transitous/Valhalla/fixture |
| `MAPS_LIVE` | Set to `0` to force the labeled fixture |

4. Open the preview URL (production is `https://grwm-navy.vercel.app`). The left-column
   leave-by time and shower / hair / dressed windows should load without a laptop Express
   process. Confirm the API with:

   ```bash
   curl -sS https://grwm-navy.vercel.app/api/planner | head
   ```

   That body should be JSON (`{"ok":true,...}` or a documented error). If Vercel still
   serves `index.html` for `/api/*`, the UI uses the labeled Columbia → Soothr fixture
   so leave-by still appears.

After that, Vercel's Git integration is the pipeline:

- **Every push to any branch** gets its own preview URL, linked from its pull request.
- **Pushes to `main`** deploy to production.
- **A deploy fails if lint or any test fails**, because the build runs `npm run verify`.
- **Pushes that don't touch the UI or API are skipped** — if nothing under `frontend/`,
  `shared/contracts/`, `fixtures/`, `api/`, `backend/`, or `vercel.json` changed since the
  branch's last successful deploy, Vercel doesn't rebuild. When that can't be determined, it
  builds.

## Layout

```text
frontend/src/
├── app/          # App entry and screen composition (integration-owned)
├── features/
│   ├── overview/   # Compact default view, assembles the other modules
│   ├── weather/    # Weather module and clothing/packing display
│   ├── calendar/   # Clock, date, and upcoming events — implemented, top-right
│   ├── maps/       # Travel options and leave-by summary
│   ├── planner/    # Getting-ready timeline and conflicts
│   └── assistant/  # Push-to-talk, microphone and listening status
├── shared/
│   └── time/       # New York time math and formatting
└── test/         # Vitest setup
```

The mirror layout in [`src/app/App.css`](src/app/App.css) defines screen regions (left column
for weather, plan, and leave-by; top-right for clock and calendar). Unfilled regions stay
pure black. On screens narrower than 52rem the regions stack full width.

## Display behavior

The mirror opens on a **greeting screen** with a time-appropriate salutation, then **fades
into a compact overview** showing current and afternoon weather, the upcoming event, a short
getting-ready plan, and a leave-by summary.

A voice command **expands one module** into a focused view. "Go back" or "show overview"
restores the compact view. Visible microphone, listening, loading, and error states are
required, and the user must be able to retry or use basic on-screen controls when voice
recognition fails.

## The rule that shapes this whole layer

**React does not decide intent.** The UI must not string match spoken phrases. Grok selects
intent through a bounded tool list, the backend validates and executes, and React receives a
**typed UI event**. React owns the actual expansion and fade animation; the assistant never
generates JSX or manipulates browser elements.

## Ownership

Frontend feature modules render state. They do not own provider requests, API credentials, or
the logic that belongs to a backend feature.

Time handling is split deliberately. **Display** time — the clock, formatting, and
Today/Tomorrow labels — lives in [`src/shared/time/`](src/shared/time/). **Scheduling**
arithmetic — leave-by deadlines, travel buffers, and plan feasibility — belongs to the backend
planner feature and must not be reimplemented here.

[`src/app/`](src/app/README.md) and [`src/shared/`](src/shared/README.md) are
integration-owned; coordinate before restructuring them.

## Design notes

The display sits behind a two-way mirror. Assume a black background, high contrast, and type
readable at a distance — unlit pixels are what make the mirror effect work.

Any weather or travel figure shown during the demo must be either genuinely retrieved or
**visibly labeled as a fixture**.
