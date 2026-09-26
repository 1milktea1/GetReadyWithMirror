# Contract: Maps Result

**Owner:** TBD
**Status:** Proposed in [`types.ts`](types.ts) — used by the backend maps feature and the planner, not yet agreed
**Producer:** [`backend/src/features/maps/`](../../../backend/src/features/maps/README.md)

[`types.ts`](types.ts) is the source of truth.

## `MapsResult`

| Field | Proposed name | Notes |
|---|---|---|
| Origin | `origin` `{ name, address }` | Columbia University for the demo |
| Destination | `destination` `{ name, address }` | Soothr, 204 E 13th St |
| Alternatives | `routes[]` `{ mode, durationMinutes, summary, disruptions }` | Whole minutes |
| Recommended mode | `recommendedMode` | `transit` in the demo fixture |
| Retrieved at | `retrievedAt` | ISO instant |
| Provenance | `provenance` `{ source, isFixture }` | `fixture` until live maps exists |

`mode` is `transit`, `driving`, `walking`, or `cycling`.

The demo fixture's durations are rehearsal numbers. `isFixture: true` is how the UI labels
them. A pair the fixture does not cover is `{ ok: false, error: { status: "no-data" } }`,
never a made-up duration.

## HTTP

`GET /api/maps` — optional `origin`, `destination`, and `now`.

## Resolved for the demo, still open for the team

- The planner asks for one mode and also receives the other routes, so it can *suggest* a
  faster mode. It does not switch modes on its own.
- How stale a live retrieval may be is still open, because nothing is live yet.

## Consumers

- Backend planner (travel duration for leave-by) — implemented.
- Frontend overview, via the plan's `leaveBy` and fixture badge — implemented.
- Backend assistant, via `getCommute` — not yet.

## Change rule

Changing this contract updates this document, [`types.ts`](types.ts), and the consumers in the
same pull request.
