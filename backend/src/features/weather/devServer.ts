// INTERIM: standalone dev server so the frontend can reach weather before backend/src/app/
// (integration-owned) exists. Delete once weatherHttp.ts is mounted there.
// Run from backend/: `npm run dev:weather`

import { createServer } from 'node:http';
import { handleLocationSearch, handleWeatherRequest } from './weatherHttp.ts';

const PORT = Number(process.env.PORT ?? 3001);

const routes: Record<string, (q: URLSearchParams) => Promise<{ status: number; body: unknown }>> = {
  '/api/weather': handleWeatherRequest,
  '/api/weather/locations': handleLocationSearch,
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const handler = req.method === 'GET' ? routes[url.pathname] : undefined;
  const { status, body } = handler
    ? await handler(url.searchParams)
    : { status: 404, body: { ok: false, error: { status: 'no-data', message: 'Not found' } } };
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}).listen(PORT, () => {
  console.log(`Weather dev server: http://localhost:${PORT}/api/weather`);
});
