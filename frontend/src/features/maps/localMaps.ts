// Fixture-only commute for hosts that do not serve Express. Same Columbia → Soothr
// durations the backend fixture adapter returns. No provider calls from the browser.

import type { MapsResponse, RouteAlternative, TransportMode } from '@contracts/maps/types'
import mapsFixture from '@fixtures/maps/columbia-to-soothr.json'

export function generateLocalMaps(now = new Date()): MapsResponse {
  const routes: RouteAlternative[] = mapsFixture.routes.map((route) => ({
    mode: route.mode as TransportMode,
    durationMinutes: route.durationMinutes,
    summary: route.summary,
    disruptions: [...route.disruptions],
    path: [],
    provenance: { source: 'fixture', isFixture: true },
  }))
  const driving = routes.find((route) => route.mode === 'driving')
  if (driving && !routes.some((route) => route.mode === 'rideshare')) {
    routes.push({
      ...driving,
      mode: 'rideshare',
      summary: 'Rehearsal estimate — rideshare uses the driving time',
      disruptions: [...driving.disruptions],
      path: [],
    })
  }
  const recommended = routes.find((route) => route.mode === mapsFixture.recommendedMode) ?? routes[0]
  if (!recommended) {
    return { ok: false, error: { status: 'no-data', message: 'No fixture route for that trip.' } }
  }
  return {
    ok: true,
    data: {
      origin: mapsFixture.origin,
      destination: mapsFixture.destination,
      routes,
      recommendedMode: mapsFixture.recommendedMode as TransportMode,
      retrievedAt: now.toISOString(),
      provenance: recommended.provenance,
    },
  }
}
