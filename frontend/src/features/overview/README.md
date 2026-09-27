# Frontend Feature: Overview

**Owner:** TBD
**Status:** Composed in [`App.tsx`](../../app/App.tsx): weather top-left, getting-ready plan
and leave-by under weather on the left, clock and calendar top-right. The map is not on
this screen.

Voice and motion agents expand it by calling `window.mirrorCommand({ action: 'expandWidget', widget: 'map' })`.
That hides weather and the calendar agenda. The clock stays top-right. The leave-by plan
stays on the left over the map.
`{ action: 'showOverview' }` or Escape returns here. A Pico `SWIPE:LEFT` opens unwind instead;
`SWIPE:RIGHT` is the same as `showOverview`. See [`mirrorCommands.ts`](mirrorCommands.ts).

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
