// Vercel serves this at GET /api/weather. The laptop dev server stays the local path;
// both call the same handler so the preview and the mirror return the same forecast.

import { handleWeatherRequest } from '../../backend/src/features/weather/weatherHttp.ts'

export async function GET(request: Request): Promise<Response> {
  const { status, body } = await handleWeatherRequest(new URL(request.url).searchParams)
  return Response.json(body, { status })
}
