// Single Express composition point. Mounts feature HTTP handlers and contains no
// planning, routing, or forecast logic of its own.

import express from 'express';
import type { Express, Request, Response } from 'express';
import { handleMapsRequest } from '../features/maps/mapsHttp.ts';
import { handlePlannerRequest } from '../features/planner/plannerHttp.ts';
import { handleLocationSearch, handleWeatherRequest } from '../features/weather/weatherHttp.ts';

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

  return app;
}
