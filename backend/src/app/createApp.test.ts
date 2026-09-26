import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';

import { createApp } from './createApp.ts';

test('Express mounts health, maps, and the planner', async () => {
  const server = createApp().listen(0);
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  try {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true, service: 'getreadywithmirror' });

    const maps = (await (await fetch(`${base}/api/maps`)).json()) as {
      ok: boolean;
      data: { provenance: { isFixture: boolean }; routes: { mode: string; durationMinutes: number }[] };
    };
    assert.equal(maps.ok, true);
    assert.equal(maps.data.provenance.isFixture, true);
    assert.equal(maps.data.routes.find((route) => route.mode === 'transit')?.durationMinutes, 35);

    const planner = (await (await fetch(`${base}/api/planner?now=2026-09-26T18:00:00-04:00`)).json()) as {
      ok: boolean;
      data: { status: string; leaveBy: { at: string }; tasks: { end: string | null; overruns: boolean }[] };
    };
    assert.equal(planner.ok, true);
    assert.equal(planner.data.status, 'ok');
    const last = planner.data.tasks.at(-1);
    assert.equal(last?.end, planner.data.leaveBy.at);
    assert.equal(planner.data.tasks.some((task) => task.overruns), false);
  } finally {
    server.close();
    await once(server, 'close');
  }
});
