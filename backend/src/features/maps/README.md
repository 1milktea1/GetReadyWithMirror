# Backend Feature: Maps

**Owner:** TBD
**Status:** Live adapters with a labeled fixture fallback — contract proposed
**Contract:** [`shared/contracts/maps/`](../../../../shared/contracts/maps/README.md)

## Responsibility

Owns origin/destination routing and the travel duration the planner turns into a leave-by
time. The demo route is Columbia University → Soothr, 204 E 13th St.

Provider order for each mode:

1. **Google Directions** when `GOOGLE_MAPS_API_KEY` is set. Driving uses `departure_time`
   when the clock is not in the past, so the duration can include traffic. Transit returns
   Google's route geometry.
2. **Transitous** (`api.transitous.org`) for subway when Google did not return one. The path
   follows the walk to the station, the trains, and the walk to the door. It is not a straight
   line between the pins. `transitModes=SUBWAY`.
3. **Valhalla** (`valhalla1.openstreetmap.de`) for walking, driving, and cycling when that mode
   is still missing. This road router has no live traffic and no subway schedules.
4. **Fixture** [`fixtures/maps/columbia-to-soothr.json`](../../../../fixtures/maps/columbia-to-soothr.json)
   for any mode still missing on the demo pair. Those durations are rehearsal numbers,
   `provenance.isFixture: true`. A fixture subway has no path, so the map shows pins only.

Rideshare is not a Directions or Valhalla mode. It copies the driving route and says so in
`summary`. An origin/destination the fixture does not cover, with no Google key, returns
`no-data` rather than a guessed duration.

`MAPS_LIVE=0` skips Google and Valhalla. The test script sets it so the suite stays offline.
`npm run dev` loads `backend/.env` when that file exists (`--env-file-if-exists`).

## Public API

`getCommute({ originAddress?, destinationAddress?, now?, live?, fetchFn? })` → `MapsResponse`

Omitted addresses use the fixture pair (Columbia → Soothr). `now` stamps `retrievedAt`.
Google also uses it as `departure_time` when it is not more than a minute in the past.

`GET /api/maps` accepts `origin`, `destination`, and `now`.

Default recommendation is **transit**. Without a key that is the fixture's 35 minutes.
The fixture also includes cycling (28), driving (30), and walking (105).

## Files

| File | Role |
|---|---|
| `mapsService.ts` | Public `getCommute`. The only entry point other features use. |
| `googleDirectionsAdapter.ts` | Directions API. The key never leaves this process. |
| `transitAdapter.ts` | Public subway itineraries and their geometry. |
| `valhallaAdapter.ts` | Public road router for walking, driving, and cycling. |
| `fixtureAdapter.ts` | Reads and validates the fixture. |
| `mapsHttp.ts` | `GET /api/maps`. |
| `maps.test.ts` | Fixture, polyline, and faked Google / Valhalla responses. |

## Error states

- `no-data` — no fixture route for that pair, and live routing is not configured or returned nothing.
- `input-invalid` — empty address or a bad `now`.
- A provider failure on the demo pair falls through to the next source instead of failing the request.

## Does NOT own

- Leave-by math, outfit suggestions, or calendar editing.
