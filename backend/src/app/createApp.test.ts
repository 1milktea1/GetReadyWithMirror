import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';

import { createApp } from './createApp.ts';

test('Express mounts health, maps, planner, assistant, and voice', async () => {
  const server = createApp().listen(0);
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  try {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true, service: 'getreadywithmirror' });

    const maps = (await (await fetch(`${base}/api/maps?now=2026-09-26T16:00:00-04:00`)).json()) as {
      ok: boolean;
      data: { provenance: { isFixture: boolean }; routes: { mode: string; durationMinutes: number }[] };
    };
    assert.equal(maps.ok, true);
    assert.equal(maps.data.provenance.isFixture, true);
    assert.equal(maps.data.routes.find((route) => route.mode === 'transit')?.durationMinutes, 35);

    const planner = (await (await fetch(`${base}/api/planner?now=2026-09-26T18:00:00-04:00`)).json()) as {
      ok: boolean;
      data: { status: string; conflict: { shortfallMinutes: number } | null };
    };
    assert.equal(planner.ok, true);
    assert.equal(planner.data.status, 'schedule-conflict');
    assert.equal(planner.data.conflict?.shortfallMinutes, 30);

    const assistant = await fetch(`${base}/api/assistant`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ utterance: 'What is the weather?' }),
    });
    assert.equal(assistant.status, 503);
    const assistantBody = (await assistant.json()) as { ok: boolean; error: { status: string } };
    assert.equal(assistantBody.ok, false);
    assert.equal(assistantBody.error.status, 'not-configured');

    const speak = await fetch(`${base}/api/voice/speak`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'Leave by six fifteen.' }),
    });
    assert.equal(speak.status, 503);
  } finally {
    server.close();
    await once(server, 'close');
  }
});
