import { handleVercelGet } from '../backend/src/app/vercelHttp.ts';
import { handleMapsRequest } from '../backend/src/features/maps/mapsHttp.ts';

export async function GET(request: Request): Promise<Response> {
  return handleVercelGet(request, handleMapsRequest);
}
