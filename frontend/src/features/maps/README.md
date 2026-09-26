# Frontend Feature: Maps

**Owner:** TBD
**Status:** Left-side route map on the overview

`MapPanel` draws `GET /api/maps` on a dark CARTO basemap (OpenStreetMap data). The browser
does not call Google or OSRM and never sees `GOOGLE_MAPS_API_KEY`.

Subway, Walk, Drive, and Rideshare are selectable. Subway is the default. The chosen mode is
owned by the overview and passed to the planner, so leave-by uses that mode's duration.

Each route is labeled from its own provenance: `Sample route — not live`, `Live directions`,
or `Live road route`. A fixture route with no path is a dashed line between the two pins,
called out as not a road path.

## Does NOT own

Maps provider requests, API credentials, or the leave-by calculation itself, which belongs to
the backend planner feature.
