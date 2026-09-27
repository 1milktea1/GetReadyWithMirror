import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';

import { createApp } from '../../app/createApp.ts';
import { publishSwipe, subscribeSwipe } from './gestureHub.ts';
import { parseSwipeLine, parseSwipePayload } from './swipe.ts';

test('parseSwipeLine accepts Pico SWIPE lines only', () => {
  assert.equal(parseSwipeLine('SWIPE:LEFT'), 'left');
  assert.equal(parseSwipeLine('swipe: right'), 'right');
  assert.equal(parseSwipeLine('HAND:NONE'), null);
  assert.equal(parseSwipeLine('SWIPE:UP'), null);
});

test('parseSwipePayload accepts gesture or raw line', () => {
  assert.equal(parseSwipePayload({ gesture: 'left' }), 'left');
  assert.equal(parseSwipePayload({ line: 'SWIPE:RIGHT' }), 'right');
  assert.equal(parseSwipePayload({ gesture: 'up' }), null);
});

test('gesture hub delivers a swipe to subscribers', () => {
  const seen: string[] = [];
  const stop = subscribeSwipe((gesture) => seen.push(gesture));
  publishSwipe('left');
  stop();
  publishSwipe('right');
  assert.deepEqual(seen, ['left']);
});

test('POST /api/hardware/gesture fans out on the SSE stream', async () => {
  const server = createApp().listen(0);
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  const controller = new AbortController();
  try {
    const stream = await fetch(`${base}/api/hardware/gestures`, { signal: controller.signal });
    assert.equal(stream.status, 200);
    assert.match(String(stream.headers.get('content-type')), /text\/event-stream/);
    assert.ok(stream.body);

    const reader = stream.body.getReader();
    const decoder = new TextDecoder();
    const posted = fetch(`${base}/api/hardware/gesture`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gesture: 'left' }),
    });

    let buffer = '';
    const deadline = Date.now() + 2000;
    while (!buffer.includes('"gesture":"left"') && Date.now() < deadline) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
    }
    const postResult = await posted;
    assert.equal(postResult.status, 204);
    assert.match(buffer, /"gesture":"left"/);

    const bad = await fetch(`${base}/api/hardware/gesture`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gesture: 'up' }),
    });
    assert.equal(bad.status, 400);
  } finally {
    controller.abort();
    server.close();
    await once(server, 'close');
  }
});
