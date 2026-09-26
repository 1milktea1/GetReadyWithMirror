import assert from 'node:assert/strict';
import { test } from 'node:test';

import { GET as getMaps } from '../../../api/maps.ts';
import { GET as getPlanner } from '../../../api/planner.ts';
import { handleVercelGet } from './vercelHttp.ts';

test('Vercel GET wrappers return the same planner and maps envelopes as Express', async () => {
  const planner = await getPlanner(new Request('http://localhost/api/planner?now=2026-09-26T16:00:00-04:00'));
  assert.equal(planner.status, 200);
  const plannerBody = (await planner.json()) as {
    ok: boolean;
    data: { leaveBy: { at: string }; tasks: { end: string | null }[]; provenance: { isFixture: boolean } };
  };
  assert.equal(plannerBody.ok, true);
  assert.equal(plannerBody.data.leaveBy.at, '2026-09-26T22:15:00.000Z');
  assert.equal(plannerBody.data.tasks.at(-1)?.end, plannerBody.data.leaveBy.at);
  assert.equal(plannerBody.data.provenance.isFixture, true);

  const maps = await getMaps(new Request('http://localhost/api/maps'));
  assert.equal(maps.status, 200);
  const mapsBody = (await maps.json()) as {
    ok: boolean;
    data: { provenance: { isFixture: boolean }; routes: { mode: string; durationMinutes: number }[] };
  };
  assert.equal(mapsBody.ok, true);
  assert.equal(mapsBody.data.provenance.isFixture, true);
  assert.equal(mapsBody.data.routes.find((route) => route.mode === 'transit')?.durationMinutes, 35);
});

test('Vercel adapter turns a thrown handler into a JSON 500', async () => {
  const response = await handleVercelGet(new Request('http://localhost/api/planner'), () => {
    throw new Error('boom');
  });
  assert.equal(response.status, 500);
  const body = (await response.json()) as { ok: boolean; error: { status: string } };
  assert.equal(body.ok, false);
  assert.equal(body.error.status, 'no-data');
});
