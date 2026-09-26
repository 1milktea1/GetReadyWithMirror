# Contract: Maps Result

**Owner:** TBD
**Status:** Proposed in [`types.ts`](types.ts) — used by the backend maps feature and the planner, not yet agreed
**Producer:** [`backend/src/features/maps/`](../../../backend/src/features/maps/README.md)

[`types.ts`](types.ts) is the source of truth.

## `MapsResult`

| Field | Proposed name | Notes |
|---|---|---|
| Origin | `origin` `{ name, address, location }` | Columbia University for the demo |
| Destination | `destination` `{ name, address, location }` | Soothr, 204 E 13th St |
| Alternatives | `routes[]` `{ mode, durationMinutes, summary, disruptions, path, provenance }` | Whole minutes. `path` may be empty. |
| Recommended mode | `recommendedMode` | `transit` for the demo |
| Retrieved at | `retrievedAt` | ISO instant |
| Provenance | `provenance` `{ source, isFixture }` | Provenance of the recommended route. `source` is `google`, `osrm`, or `fixture`. |

`mode` is `transit`, `driving`, `walking`, `cycling`, or `rideshare`. Rideshare copies driving.

The demo fixture's durations are rehearsal numbers. `isFixture: true` is how the UI labels
them. Each route carries its own provenance, so a live walk can sit next to a fixture subway.
A pair the fixture does not cover, with no Google key, is
`{ ok: false, error: { status: "no-data" } }`, never a made-up duration.

## HTTP

`GET /api/maps` — optional `origin`, `destination`, and `now`.

## Resolved for the demo, still open for the team

- The planner asks for one mode and also receives the other routes, so it can *suggest* a
  faster mode. It does not switch modes on its own.
- Live results are cached in the maps process for 60 seconds. A longer freshness policy is still open.

## Consumers

- Backend planner (travel duration for leave-by) — implemented.
- Frontend overview, via the plan's `leaveBy` and fixture badge — implemented.
- Backend assistant, via `getCommute` — not yet.

## Change rule

Changing this contract updates this document, [`types.ts`](types.ts), and the consumers in the
same pull request.
