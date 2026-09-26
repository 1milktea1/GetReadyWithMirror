import { test } from 'node:test';
import assert from 'node:assert/strict';

import { RUSH_MODEL, STT_MODEL, TTS_MODEL } from './elevenLabs.ts';
import { speak, transcribe } from './voiceService.ts';

test('transcribe sends Scribe audio and returns the text', async () => {
  let seen = '';
  const fetchFn = (async (url: string, init?: RequestInit) => {
    seen = `${url}\n${init?.body instanceof Uint8Array ? new TextDecoder().decode(init.body) : ''}`;
    return new Response(JSON.stringify({ text: ' expand the weather ' }));
  }) as typeof fetch;

  const result = await transcribe(new TextEncoder().encode('audio'), 'audio/webm', {
    apiKey: 'test-key',
    fetchFn,
  });
  assert.deepEqual(result, { ok: true, data: { text: 'expand the weather' } });
  assert.match(seen, /speech-to-text/);
  assert.match(seen, new RegExp(STT_MODEL));
  assert.match(seen, /name="file"/);
});

test('a missing ElevenLabs key is not-configured and makes no request', async () => {
  let called = false;
  const fetchFn = (async () => {
    called = true;
    return new Response('no');
  }) as typeof fetch;
  const result = await transcribe(new Uint8Array([1]), 'audio/webm', { apiKey: '', fetchFn });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.status, 'not-configured');
  assert.equal(called, false);
});

test('empty recognition is no-data', async () => {
  const fetchFn = (async () => new Response(JSON.stringify({ text: '   ' }))) as typeof fetch;
  const result = await transcribe(new Uint8Array([1]), 'audio/webm', { apiKey: 'k', fetchFn });
  assert.equal(result.ok ? null : result.error.status, 'no-data');
});

test('speak requests Flash audio for the reply', async () => {
  let url = '';
  let body = '';
  const fetchFn = (async (input: string, init?: RequestInit) => {
    url = input;
    body = String(init?.body);
    return new Response(new Uint8Array([1, 2, 3]));
  }) as typeof fetch;
  const result = await speak('Bring a jacket.', { apiKey: 'k', voiceId: 'voice-1', fetchFn });
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(Array.from(result.data), [1, 2, 3]);
  assert.match(url, /text-to-speech\/voice-1$/);
  assert.match(body, new RegExp(TTS_MODEL));
  assert.match(body, /Bring a jacket/);
});

test('a rush line keeps the same voice and uses the expressive model', async () => {
  let url = '';
  let body = '';
  const fetchFn = (async (input: string, init?: RequestInit) => {
    url = input;
    body = String(init?.body);
    return new Response(new Uint8Array([9]));
  }) as typeof fetch;
  const result = await speak('Dinner is in 5 minutes.', {
    apiKey: 'k',
    voiceId: 'voice-1',
    delivery: 'rush',
    minutesLeft: 5,
    fetchFn,
  });
  assert.equal(result.ok, true);
  assert.match(url, /text-to-speech\/voice-1$/);
  assert.match(body, new RegExp(RUSH_MODEL));
  assert.match(body, /"stability":0/);
  assert.match(body, /"speed":1\.25/);
  assert.doesNotMatch(body, new RegExp(TTS_MODEL));
});
