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
   line between the pins. Columbia campus pins start at the 116 St–Columbia University
   entrance so the 1 train is used (~33 min), not a 21-minute walk to the 2/3 (~54 min).
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

`getCommute({ originAddress?, destinationAddress?, destinationName?, now?, live?, fetchFn? })` → `MapsResponse`

Omitted origin uses Columbia. Omitted destination on `getCommute` uses the fixture Soothr
pin. `GET /api/maps` fills a missing destination from the next calendar event with a street
address, labeled with the event title (Dinner reservation · Soothr this afternoon,
Late dinner · Soothr after 8:30 PM, Gym · Equinox East 92nd Street tomorrow morning).
A known venue still pins on the map when live routing is off. `now` stamps
`retrievedAt`. Google also uses it as `departure_time` when it is not more than a minute in
the past.

`GET /api/maps` accepts `origin`, `destination`, and `now`. Live subway legs include MTA
line colors (red for the 1, gray for the L).

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
| `subwayLineColor.ts` | Official MTA trunk colors when a router names a line. |
| `mapsHttp.ts` | `GET /api/maps`. Defaults destination to the next addressed event. |
| `maps.test.ts` | Fixture, polyline, and faked Google / Valhalla responses. |

## Error states

- `no-data` — no fixture route for that pair, and live routing is not configured or returned nothing.
- `input-invalid` — empty address or a bad `now`.
- A provider failure on the demo pair falls through to the next source instead of failing the request.

## Does NOT own

- Leave-by math, outfit suggestions, or calendar editing.
