# Frontend Feature: Calendar

**Owner:** TBD
**Status:** Implemented with synthetic fixture data. Not yet connected to Google Calendar.

Shows the current New York time and date, then up to four upcoming events, in the top-right
region of the mirror. Clicking the event list, `?expand=calendar`, or `expandWidget` for
`calendar` opens those events in the center. Time and date stay top-right; weather and the
getting-ready plan hide. Escape returns to the overview. The expanded list shows up to twelve
events.

## What it does

- **Clock and date** in `America/New_York`, whatever time zone the viewing machine is in.
- **Upcoming events**, soonest first, grouped under `Today`, `Tomorrow`, or a weekday. Events
  that have already ended are hidden.
- The **next** event shows a countdown (`in 1 hr 9 min`); an event **under way** shows `Now`
  and its end time (`until 1:30 PM`).
- The clock is always the device's real New York time, including when the map is open.
  Fixture *events* carry no on-screen tag; the weather module's `Sample data — not live`
  badge covers provenance for the mirror as a whole.
- **Fallbacks** for loading, nothing scheduled, not connected, not set up, and provider
  unavailable — never blank space and never invented events.

## Files

| File | Purpose |
|---|---|
| `CalendarModule.tsx` | The component: clock, date, agenda, fallback states |
| `CalendarModule.css` | Module styling; text on pure black, nothing else lit |
| `selectUpcoming.ts` | Pure logic: drop ended events, sort, flag in-progress, cap |
| `useCalendarEvents.ts` | Fetches on mount and every 5 minutes, keeping the last result visible |
| `data/calendarSource.ts` | The `CalendarSource` interface — the seam for going live |
| `data/fixtureCalendarSource.ts` | Places the relative fixture onto real instants around "now" |
| `index.ts` | Public interface; other code imports from here only |
| `*.test.ts(x)` | Feature-local tests |

Shared pieces it depends on:

- [`shared/contracts/calendar/index.ts`](../../../../shared/contracts/calendar/index.ts) — the
  `CalendarEvent` and `CalendarResult` shapes.
- [`fixtures/calendar/demo-day.json`](../../../../fixtures/calendar/demo-day.json) — the synthetic
  agenda.
- [`frontend/src/shared/time/`](../../shared/time/) — New York time math and formatting.

## Going live with Google Calendar

The frontend never calls Google directly: credentials must stay server-side. The plan is:

1. **Backend** — implement the Google adapter in
   [`backend/src/features/calendar/`](../../../../backend/src/features/calendar/README.md) and
   serve `GET /api/calendar`, returning a `CalendarResult` from the shared contract. Map OAuth
   and provider failures onto the contract's `status` values.
2. **Frontend** — add `data/httpCalendarSource.ts` implementing `CalendarSource` with a fetch to
   `/api/calendar`.
3. **Swap one line** in [`frontend/src/app/App.tsx`](../../app/App.tsx):
   `createFixtureCalendarSource()` becomes the HTTP source.

`CalendarModule` and its tests need no changes.

Deciding the OAuth flow, scopes, and which calendars to read is open — see
[`docs/decisions.md`](../../../../docs/decisions.md) D6.

## Does NOT own

Calendar provider requests, OAuth credentials, or event selection on the server. Time
arithmetic lives in `frontend/src/shared/time/`, not here.
