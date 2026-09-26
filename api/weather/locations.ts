// Vercel serves this at GET /api/weather/locations.

import { handleLocationSearch } from '../../backend/src/features/weather/weatherHttp.ts'

export async function GET(request: Request): Promise<Response> {
  const { status, body } = await handleLocationSearch(new URL(request.url).searchParams)
  return Response.json(body, { status })
}
