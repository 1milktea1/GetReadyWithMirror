// Single Express composition point. Mounts feature HTTP handlers and contains no
// planning, routing, or forecast logic of its own.

import type { IncomingMessage } from 'node:http';

import express from 'express';
import type { Express, Request, Response } from 'express';
import { handleAssistantTurn } from '../features/assistant/assistantHttp.ts';
import { parseRushRequest, writeRushLine } from '../features/assistant/rushLine.ts';
import { handleMapsRequest } from '../features/maps/mapsHttp.ts';
import { handlePlannerRequest } from '../features/planner/plannerHttp.ts';
import { handleSpeak, handleTranscribe, readLimitedBody } from '../features/voice/voiceHttp.ts';
import { handleLocationSearch, handleWeatherRequest } from '../features/weather/weatherHttp.ts';

const MAX_JSON = 64_000;
const MAX_AUDIO = 8_000_000;

type QueryHandler = (query: URLSearchParams) => Promise<{ status: number; body: unknown }> | { status: number; body: unknown };

function searchParams(req: Request): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') params.set(key, value);
  }
  return params;
}

function mount(app: Express, path: string, handler: QueryHandler): void {
  app.get(path, async (req: Request, res: Response) => {
    const result = await handler(searchParams(req));
    res.status(result.status).json(result.body);
  });
}

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'getreadywithmirror' });
  });

  mount(app, '/api/weather', handleWeatherRequest);
  mount(app, '/api/weather/locations', handleLocationSearch);
  mount(app, '/api/maps', handleMapsRequest);
  mount(app, '/api/planner', handlePlannerRequest);
  mountVoice(app);

  return app;
}

function mountVoice(app: Express): void {
  app.post('/api/voice/transcribe', async (req: Request, res: Response) => {
    try {
      const audio = await readLimitedBody(req, MAX_AUDIO);
      if (audio === 'too-large') {
        res.status(400).json({ ok: false, error: { status: 'input-invalid', message: 'That recording is too long.' } });
        return;
      }
      const mime = String(req.headers['content-type'] ?? 'application/octet-stream').split(';')[0];
      const { status, body } = await handleTranscribe(audio, mime);
      res.status(status).json(body);
    } catch (err) {
      fail(res, err);
    }
  });

  app.post('/api/assistant', async (req: Request, res: Response) => {
    const payload = await readJson(req, res);
    if (payload === undefined) return;
    try {
      const { status, body } = await handleAssistantTurn(payload);
      res.status(status).json(body);
    } catch (err) {
      fail(res, err);
    }
  });

  app.post('/api/voice/speak', async (req: Request, res: Response) => {
    const payload = await readJson(req, res);
    if (payload === undefined) return;
    const text = payload && typeof payload === 'object' ? (payload as { text?: unknown }).text : undefined;
    try {
      await sendSpeech(res, await handleSpeak(typeof text === 'string' ? text : ''));
    } catch (err) {
      fail(res, err);
    }
  });

  app.post('/api/voice/rush', async (req: Request, res: Response) => {
    const payload = await readJson(req, res);
    if (payload === undefined) return;
    const rush = parseRushRequest(payload);
    if (!rush) {
      res.status(400).json({ ok: false, error: { status: 'input-invalid', message: 'title, start, and minutesLeft are required.' } });
      return;
    }
    try {
      await sendSpeech(res, await handleSpeak(await writeRushLine(rush), 'rush', rush.minutesLeft));
    } catch (err) {
      fail(res, err);
    }
  });
}

async function readJson(req: Request, res: Response): Promise<unknown | undefined> {
  const raw = await readLimitedBody(req as IncomingMessage, MAX_JSON);
  if (raw === 'too-large') {
    res.status(400).json({ ok: false, error: { status: 'input-invalid', message: 'Request body is too large.' } });
    return undefined;
  }
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    res.status(400).json({ ok: false, error: { status: 'input-invalid', message: 'Request body must be JSON.' } });
    return undefined;
  }
}

async function sendSpeech(res: Response, spoken: { status: number; body?: unknown; audio?: Uint8Array }): Promise<void> {
  if (spoken.audio) {
    res.status(200).type('audio/mpeg').send(Buffer.from(spoken.audio));
    return;
  }
  res.status(spoken.status).json(spoken.body);
}

function fail(res: Response, err: unknown): void {
  res.status(500).json({
    ok: false,
    error: { status: 'external-provider-unavailable', message: err instanceof Error ? err.message : 'Request failed.' },
  });
}
