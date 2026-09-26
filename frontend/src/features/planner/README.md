# Frontend Feature: Planner

**Owner:** TBD
**Status:** Overview tile implemented. It renders `GET /api/planner`. On Vercel that URL is a
serverless function wrapping the same handler as Express. If the response is HTML (a static
404), the tile uses the labeled fixture plan so leave-by still appears.

The compact tile sits on the left under weather and shows the leave-by time and each task
window. The same leave-by stays in a reminder card under that plan. Click to expand, mark a
task done, or give hair 20 more minutes. Those controls call the backend again; they do not
edit the schedule in the browser. The overview's transportation choice is sent as `mode`. A
fixture duration shows `Sample route — not live`.

The backend packs every routine so the last unfinished task ends at leave-by. The tile still
renders a conflict payload if one arrives.

## Planned future files

Compact plan summary, expanded timeline view, conflict presentation, and controls for
adjusting a task duration or marking a task complete.

## Does NOT own

Live maps providers and API keys. Fixture leave-by math is the same `buildPlan` the backend
uses; the browser only runs it when `/api/planner` is not JSON.
