import { handleVercelGet } from '../backend/src/app/vercelHttp.ts';
import { handleWeatherRequest } from '../backend/src/features/weather/weatherHttp.ts';

export async function GET(request: Request): Promise<Response> {
  return handleVercelGet(request, handleWeatherRequest);
}
