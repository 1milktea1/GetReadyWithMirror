# Frontend Feature: Maps

**Owner:** TBD
**Status:** Opens over the overview on command. Not part of the default dashboard.

`MapPanel` draws `GET /api/maps` on OpenStreetMap raster tiles, inverted so the mirror stays
dark. CARTO's public dark tiles currently return a key watermark, so they are not used. The browser
does not call Google, Transitous, or Valhalla and never sees `GOOGLE_MAPS_API_KEY`.

The overview shows the map only after `expandWidget` for `map` (voice agent or physical motion
agent) or `?expand=map`. Weather and the calendar agenda hide. The clock stays top-right.
The leave-by plan stays on the left. `showOverview` or Escape restores the dashboard. A
subway result with no path draws the two pins and no connecting line.
Live subway legs are drawn in MTA line colors (red for the 1, gray for the L).
The destination is the next addressed calendar event, not a hardcoded Soothr pin.

Subway, Walk, Drive, and Rideshare are selectable. Subway is the default. The chosen mode is
owned by the overview and passed to the planner, so leave-by uses that mode's duration.

Each route is labeled from its own provenance: `Sample route — not live`, `Live directions`,
`Live subway`, or `Live road route`. A route with no path shows the two pins and no line.

## Does NOT own

Maps provider requests, API credentials, or the leave-by calculation itself, which belongs to
the backend planner feature.
