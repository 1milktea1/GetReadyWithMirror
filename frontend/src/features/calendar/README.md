# Frontend Feature: Calendar

**Owner:** TBD
**Status:** Implemented with synthetic fixture data. Not yet connected to Google Calendar.

Shows the current New York time and date, then up to four upcoming events, in the top-right
region of the mirror.

## What it does

- **Clock and date** in `America/New_York`, whatever time zone the viewing machine is in.
- **Upcoming events**, soonest first, grouped under `Today`, `Tomorrow`, or a weekday. Events
  that have already ended are hidden.
- The **next** event shows a countdown (`in 1 hr 9 min`); an event **under way** shows `Now`
  and its end time (`until 1:30 PM`).
- **Labels a simulated clock.** A `Demo time · actual 11:36 AM` tag shows the real time beside an
  overridden one, so it cannot be mistaken for the live clock. With no `?now=` in the URL, the
  clock is always the device's real time. Fixture *events* carry no on-screen tag; the weather
  module's `Sample data — not live` badge covers provenance for the mirror as a whole.
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
- [`frontend/src/shared/time/`](../../shared/time/) — New York time math, formatting, and the
  `?now=` override.

## Rehearsing different times

Add `?now=` to the URL to start the whole mirror at another time. The clock keeps ticking from
there, and a `Demo time · actual …` tag shows the real time. Remove `?now=` to return to the
real clock.

| URL | Shows |
|---|---|
| `/?now=12:45` | Lunch in progress (`Now`), office hours next |
| `/?now=15:30` | The 5 PM dinner next, with a countdown |
| `/?now=23:30` | Today finished; agenda starts with Tomorrow |
| `/?now=2026-12-15T17:00` | A specific New York date and time |

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
