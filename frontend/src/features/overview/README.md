# Frontend Feature: Overview

**Owner:** TBD
**Status:** Composed in [`App.tsx`](../../app/App.tsx): weather top-left, calendar top-right,
getting-ready plan in the center. There is no separate overview component yet.

The compact default view the mirror fades into after the greeting. Assembles current and
afternoon weather, the upcoming calendar event, a short getting-ready plan, and a leave-by
summary into one glanceable layout. The plan and leave-by come from the planner API.

Overview **assembles results**. It must not duplicate provider logic or re-derive anything the
backend features already normalize.

Returning here is what `showOverview` and a spoken "go back" trigger.

## Planned future files

Screen composition and layout for the compact view; per-module summary tiles.

## Does NOT own

Provider requests, secret credentials, or any logic that belongs to a backend feature.
