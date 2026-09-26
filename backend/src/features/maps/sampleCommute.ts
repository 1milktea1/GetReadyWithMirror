// Labeled rehearsal route. The assistant and the map screen both read this.
// It is not a live directions lookup.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function getSampleCommute() {
  const fixture = JSON.parse(
    readFileSync(fileURLToPath(new URL('../../../../fixtures/maps/columbia-to-soothr.json', import.meta.url)), 'utf8'),
  ) as {
    origin: { name: string; address: string };
    destination: { name: string; address: string };
    recommendedMode: string;
    routes: { mode: string; durationMinutes: number; summary: string }[];
  };
  const recommended = fixture.routes.find((route) => route.mode === fixture.recommendedMode) ?? fixture.routes[0];
  return {
    ok: true as const,
    data: {
      provenance: 'fixture' as const,
      label: 'Rehearsal estimate, not a live route.',
      origin: fixture.origin,
      destination: fixture.destination,
      recommendedMode: fixture.recommendedMode,
      durationMinutes: recommended.durationMinutes,
      routes: fixture.routes,
    },
  };
}
