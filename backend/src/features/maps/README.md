# Backend Feature: Maps

**Owner:** TBD
**Status:** Fixture-backed for the demo route — contract proposed, live Google Maps not connected
**Contract:** [`shared/contracts/maps/`](../../../../shared/contracts/maps/README.md)

## Responsibility

Owns origin/destination routing and the travel duration the planner turns into a leave-by
time. The demo route is Columbia University → Soothr, 204 E 13th St.

Live Google Maps is not configured (decisions D7). Until it is, this feature serves
[`fixtures/maps/columbia-to-soothr.json`](../../../../fixtures/maps/columbia-to-soothr.json).
Those durations are **rehearsal numbers**, labeled `provenance.isFixture: true`. They are not
a measured route. An origin or destination the fixture does not cover returns `no-data`
rather than a guessed duration.

## Public API

`getCommute({ originAddress?, destinationAddress?, now? })` → `MapsResponse`

Omitted addresses use the fixture pair (Columbia → Soothr). `now` only stamps `retrievedAt`;
it does not change the durations.

`GET /api/maps` accepts `origin`, `destination`, and `now`.

Default recommendation is **transit, 35 minutes**. The fixture also includes cycling (28),
driving (30), and walking (105) so a conflict can suggest another mode without inventing one.

## Files

| File | Role |
|---|---|
| `mapsService.ts` | Public `getCommute`. The only entry point other features use. |
| `fixtureAdapter.ts` | Reads and validates the fixture. Nothing else knows the file shape. |
| `mapsHttp.ts` | `GET /api/maps`. |
| `maps.test.ts` | Fixture duration, address match, and the no-data path. |

## Error states

- `no-data` — no fixture route for that pair, and live routing is not configured.
- `input-invalid` — empty address or a bad `now`.
- `not-configured` / `external-provider-unavailable` — reserved for a future live provider.
  The fixture path does not use them.

## Does NOT own

- Leave-by math, outfit suggestions, or calendar editing.
