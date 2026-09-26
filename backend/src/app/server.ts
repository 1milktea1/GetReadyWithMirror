// Laptop server for the mirror. The browser talks only to these routes.
// Run from backend/: `npm run dev`

import { createServer } from 'node:http';

import { handleAssistantTurn } from '../features/assistant/assistantHttp.ts';
import { parseRushRequest, writeRushLine } from '../features/assistant/rushLine.ts';
import { getSampleCommute } from '../features/maps/sampleCommute.ts';
import { handleSpeak, handleTranscribe, readLimitedBody, sendAudio, sendJson } from '../features/voice/voiceHttp.ts';
import { handleLocationSearch, handleWeatherRequest } from '../features/weather/weatherHttp.ts';

const PORT = Number(process.env.PORT ?? 3001);
const MAX_JSON = 64_000;
const MAX_AUDIO = 8_000_000;

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/maps') {
      sendJson(res, 200, getSampleCommute());
      return;
    }

    if (req.method === 'GET' && (url.pathname === '/api/weather' || url.pathname === '/api/weather/locations')) {
      const handler = url.pathname === '/api/weather' ? handleWeatherRequest : handleLocationSearch;
      const { status, body } = await handler(url.searchParams);
      sendJson(res, status, body);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/voice/transcribe') {
      const audio = await readLimitedBody(req, MAX_AUDIO);
      if (audio === 'too-large') {
        sendJson(res, 400, { ok: false, error: { status: 'input-invalid', message: 'That recording is too long.' } });
        return;
      }
      const mime = String(req.headers['content-type'] ?? 'application/octet-stream').split(';')[0];
      const { status, body } = await handleTranscribe(audio, mime);
      sendJson(res, status, body);
      return;
    }

    if (req.method === 'POST' && (url.pathname === '/api/assistant' || url.pathname === '/api/voice/speak' || url.pathname === '/api/voice/rush')) {
      const raw = await readLimitedBody(req, MAX_JSON);
      if (raw === 'too-large') {
        sendJson(res, 400, { ok: false, error: { status: 'input-invalid', message: 'Request body is too large.' } });
        return;
      }
      let payload: unknown;
      try {
        payload = JSON.parse(raw.toString('utf8'));
      } catch {
        sendJson(res, 400, { ok: false, error: { status: 'input-invalid', message: 'Request body must be JSON.' } });
        return;
      }
      if (url.pathname === '/api/assistant') {
        const { status, body } = await handleAssistantTurn(payload);
        sendJson(res, status, body);
        return;
      }
      if (url.pathname === '/api/voice/rush') {
        const rush = parseRushRequest(payload);
        if (!rush) {
          sendJson(res, 400, { ok: false, error: { status: 'input-invalid', message: 'title, start, and minutesLeft are required.' } });
          return;
        }
        const spoken = await handleSpeak(await writeRushLine(rush), 'rush', rush.minutesLeft);
        if (spoken.audio) sendAudio(res, spoken.audio);
        else sendJson(res, spoken.status, spoken.body);
        return;
      }
      const text = payload && typeof payload === 'object' ? (payload as { text?: unknown }).text : undefined;
      const spoken = await handleSpeak(typeof text === 'string' ? text : '');
      if (spoken.audio) sendAudio(res, spoken.audio);
      else sendJson(res, spoken.status, spoken.body);
      return;
    }

    sendJson(res, 404, { ok: false, error: { status: 'no-data', message: 'Not found' } });
  } catch (err) {
    sendJson(res, 500, {
      ok: false,
      error: { status: 'external-provider-unavailable', message: err instanceof Error ? err.message : 'Request failed.' },
    });
  }
}).listen(PORT, () => {
  console.log(`Mirror API: http://localhost:${PORT}/api/assistant`);
});
