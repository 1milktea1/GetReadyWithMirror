# Vercel `/api` handlers

These files are the hosted stand-ins for the laptop Express app. Each `GET` calls the same
feature handler Express mounts (`handlePlannerRequest`, `handleMapsRequest`,
`handleWeatherRequest`). The React app still fetches `/api/planner` and `/api/maps`; on
Vercel those URLs hit these functions instead of `localhost:3001`.

Leave-by math stays in `backend/src/features/planner/schedule.ts`. When
`GOOGLE_MAPS_API_KEY` is unset, maps uses Transitous/Valhalla, then the labeled Columbia →
Soothr fixture — the same chain as `npm run dev`.

Optional Vercel project env vars (Production, Preview, and Development):

| Name | Needed? | Effect |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | No | Google Directions for subway/walk/drive |
| `MAPS_LIVE` | No | Set to `0` to force the labeled fixture |

The React bundle never receives these values.
